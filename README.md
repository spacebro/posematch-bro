# posematch-bro

posematch-bro is a tool that compares a series of position for a specific skeleton joint set.

You need to provide:

* a `matchVectors` array that is an array of poses (i.e an array of arrays of numbers)
* a `jointsName` array that is an array of string corresponding of the joints you want to use.
* a `thresholds` array that is the same length as `matchVectors` and contains the corresponding thresholds for each vector (i.e from which similarity score we emit). **rememberer that the lesser the score, the closer the similarity.**
* a `timeouts` array that is the same length as `matchVectors` and contains the corresponding timings (in ms) to wait before emitting when beyond threshold.

It's pretty specific use case, don't hesitate to contact us for any information.
