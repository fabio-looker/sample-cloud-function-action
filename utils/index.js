
const crypto = require("crypto")

module.exports = {
	warnIf,
	exitIf,
	timingSafeEqual,
	tryJsonParse,
	http:{
		processRequestBody,
		routeNotFound,
		requireInstanceAuth
		}
	}

async function warnIf(strOrPromise){
	let str = await strOrPromise
	if(str){console.warn(`WARNING: ${str}`)}
	}
async function exitIf(strOrPromise){
	let str = await strOrPromise
	if(str){
		console.error(str)
		process.exit(1)
		}
	}
function timingSafeEqual(a, b) {
	if(typeof a !== "string"){throw "String required"}
	if(typeof b !== "string"){throw "String required"}
	var aLen = Buffer.byteLength(a)
	var bLen = Buffer.byteLength(b)
	const bufA = Buffer.allocUnsafe(aLen)
	bufA.write(a)
	const bufB = Buffer.allocUnsafe(aLen) //Yes, aLen
	bufB.write(b)

	return crypto.timingSafeEqual(bufA, bufB) && aLen === bLen;
	}
function tryJsonParse(str, dft) {
	try{return JSON.parse(str)}
	catch(e){return dft}
	}

/* Http "middleware" */
async function processRequestBody(req){
	req.body = req.body || {}
	req.body.attachment = req.body.attachment || {}

	//If inline_json format, pre-parse the attachment data
	req.body.attachment.data = tryJsonParse(req.body.attachment.data) || req.body.attachment.data
	
	//If req has state, pre-parse the state_json
	let state = tryJsonParse(req.body.data && req.body.data.state_json, {})
	if(state){
		delete req.body.data.state_json
		req.body.data.state = state
		}
	}

function requireInstanceAuth(ASYNC_LOOKER_SECRET) {
	return async function (req) {
		const lookerSecret = await ASYNC_LOOKER_SECRET
		if(!lookerSecret){return}
		const expectedAuthHeader = `Token token="${lookerSecret}"`
		if(!timingSafeEqual(req.headers.authorization,expectedAuthHeader)){
			return {
				status:401,
				body: {error: "Looker instance authentication is required"}
				}
			}
		}
	}

function routeNotFound() {
	return {
		status:400,
		type: "text",
		body:"Invalid request"
		}
	}
