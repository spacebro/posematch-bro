'use strict'

const settings = require('standard-settings')
const { SpacebroClient } = require('spacebro-client')
const similarity = require('compute-cosine-similarity')

const verbose = settings.get('verbose') || false

const client = new SpacebroClient({
  host: settings.get('spacebro:host') || '127.0.0.1',
  port: settings.get('spacebro:port') || 8888,
  channelName: settings.get('spacebro:channelName') || '',
  client: {
    name: 'posematch-bro',
    description: 'posematching spacebro service'
  },
  verbose
})

let poseVector = []
const distances = []
const delays = [0, 0, 0]

const matchVectors = settings.get('matchVectors') || []
const thresholds = settings.get('thresholds') || []
const timeouts = settings.get('timeouts') || []

if ((thresholds.length !== matchVectors.length) || (timeouts.length !== matchVectors.length)) {
  console.error('ERROR: `thresholds` and `timeouts` settings must be the same length as `matchVectors`.')
  process.exit()
}

const jointsName = settings.get('jointsName') || ['Head', 'Neck', 'SpineShoulder', 'SpineMid', 'SpineBase', 'ShoulderRight', 'ElbowRight', 'WristRight', 'HandRight', 'HandTipRight', 'ThumbRight', 'ShoulderLeft', 'ElbowLeft', 'WristLeft', 'HandLeft', 'HandTipLeft', 'ThumbLeft', 'HipRight', 'KneeRight', 'AnkleRight', 'FootRight', 'HipLeft', 'KneeLeft', 'AnkleLeft', 'FootLeft']

let jointsList = {}
jointsName.forEach(name => {
  jointsList[name] = { position: [] }
})

client.on('kinect-datas', (datas) => {
  const address = datas.pop().OSCaddress
  const fulltype = address.replace(/\/bodies\/\d+\//gi, '')
  const type = fulltype.split('/')[0]
  const id = fulltype.split('/')[1]

  if (type === 'joints' && jointsList[id]) {
    jointsList[id].position[0] = datas[0].value
    jointsList[id].position[1] = datas[1].value
    jointsList[id].position[2] = (datas[2].value || 0)
  }

  compute()
})

client.on('posematch-get-current-pose', () => {
  console.log('--- posematch-get-current-pose')
  const vector = []
  Object.entries(jointsList).forEach(([name]) => {
    vector.push(jointsList[name].position[0])
    vector.push(jointsList[name].position[1])
    vector.push(jointsList[name].position[2])
  })
  console.log(vector)
  console.log('---')
})

client.on('posematch-get-reference-datas', () => {
  console.log('--- posematch-get-reference-datas')
  console.log('- body center (spine-mid):')
  console.log(jointsList.SpineMid.position)
  console.log('- arms horizontal delta:')
  console.log(Math.abs(jointsList.HandRight.position[0] - jointsList.HandLeft.position[0]))
  console.log('---')
})

function cosineDistanceMatching (poseVector1, poseVector2) {
  const cosineSimilarity = similarity(poseVector1, poseVector2) || 0
  const distance = (2 * (1 - cosineSimilarity))
  return Math.sqrt(distance)
}

function compute () {
  poseVector = []
  jointsName.forEach((name) => {
    const position = jointsList[name].position
    if (position.length) {
      poseVector.push(position[0])
      poseVector.push(position[1])
      poseVector.push(position[2])
    }
  })

  verbose && console.log('---')
  matchVectors.forEach((matchVector, index) => {
    if (poseVector.length == matchVector.length) {
      distances[index] = cosineDistanceMatching(poseVector, matchVector)
      if (distances[index] < thresholds[index]) {
        if (!delays[index]) {
          delays[index] = Date.now()
        }
        const delta = (Date.now() - delays[index])
        if (delta > timeouts[index]) {
          console.log(`match pose ${index} with score: ${distances[index]}`)
          client.emit('posematch', { pose: index, distance: distances[index] })
          delays[index] = 0
        }
      }
    }
  })

  verbose && console.log(distances)
}
