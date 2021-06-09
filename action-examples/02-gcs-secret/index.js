/*** Code Dependencies ***/
const utils = require("../../utils")
const {SecretManagerServiceClient} = require('@google-cloud/secret-manager')
const secrets = new SecretManagerServiceClient()

/*** Load & validate configs ***/
const {
	CALLBACK_URL_PREFIX,
	} = process.env
const ASYNC_LOOKER_SECRET = getSecret("LOOKER_SECRET")

utils.warnIf(check_LOOKER_SECRET())
utils.warnIf(check_CALLBACK_URL_PREFIX())

/*** Entry-point for requests ***/
exports.httpHandler = async function httpHandler(req,res) {
	const routes = {
		"/": [hubListing],
		"/action-0/form": [
			utils.http.requireInstanceAuth(ASYNC_LOOKER_SECRET),
			action0Form
			], 
		"/action-0/execute": [
			utils.http.requireInstanceAuth(ASYNC_LOOKER_SECRET),
			utils.http.processRequestBody,
			action0Execute
			],
		"/status": [hubStatus] // Debugging endpoint
		}
	try {
		const routeHandlerSequence =
			routes[req.path]
			|| [utils.http.routeNotFound]
		for(let handler of routeHandlerSequence) {
			let handlerResponse = await handler(req)
			if (!handlerResponse) continue 
			return res
				.status(handlerResponse.status || 200)
				.type(handlerResponse.type || 'json')
				.set(handlerResponse.headers || {})
				.send(handlerResponse.body || handlerResponse)
			}
		}
	catch(err) {
		console.error(err)
		res.status(500).json("Unexpected error")
		}
	}

/*** Definitions for route handler functions ***/
async function hubListing(req){
	// https://github.com/looker/actions/blob/master/docs/action_api.md#actions-list-endpoint
	return {
		integrations: [
			{
				name: "mock-app",
				label: "Mock App",
				supported_action_types: ["cell", "query", "dashboard"],
				form_url:`${process.env.CALLBACK_URL_PREFIX}/action-0/form`,
				url: `${process.env.CALLBACK_URL_PREFIX}/action-0/execute`,
				icon_data_uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEYAAABGCAYAAABxLuKEAAAFgklEQVR42u2cTWgTWxTH/xOV2kVF0VUpLrLoosK46KZNUaw1FBrUhQuXLty4bfzAQj8ExZRu1Y2LigsbspIWNxVirFJIbVIxtAErFqNgoUkhpW0ytkn+b/FerpnMTEz7fPKauQcu5N57JjPnl/uVOfcehSQhxSD7rSry+TxisRii0SjC4TBCoRCWlpb2tLFOpxOdnZ1oa2tDa2srVFXFvn37zJVpIpFIhL29vQRQ06m3t5eRSMQMAXVgstksJyYmah5IeZqYmGA2m7UGYwVFVVX6/X7G43Gm02nm83nuFcnn80yn04zH4/T7/VRV1RKOKZhIJGJ6QSAQYCqVYq1IKpViIBAwtbW0W4Ekc7mcYUzxeDycnp5mrcr09DQ9Ho9hzMnlcj/BzM3NGejVMpRSOOV2z83NkSQdABCNRnUzVSAQgMvlqvm1isvlQiAQ0JUVWTgAIBwOiwpVVdHV1WWbhVxXVxdUVRV5wYIknU6naEp+v592E7/fL+x3Op0/u1LpivbkyZO2W/6X2lxk4ShXamxstB0YM5sVklQURfcfyeFw2ApMoVDQ/WciaWwxdoNiZbP9KFQLSyKQYCQYCUaCkWAkGAlGgpFgJBgJZo9LKBSCoihQFAVPnjz5M2AWFhbETYspmUwa9JaWlgx6iUTCXi1mcnLSUDY+Pi670t27d7GxsSHyyWQSXq/XvmA8Hg9UVcXi4iLevHljaEHFeivJ5XKYmprCwMAATp8+jRMnTuDq1asYGxvD6uqqQb9QKGBmZgY+nw89PT1obW3FjRs3EAqFsLW19cvnTSQSaG9vh6IoOHToEGZmZqo39p/9MSKVy/z8vKi7du2aeKPudrv548cPrq+vs7m5mQA4OTnJjo4Oof/lyxfxPZlMhtevX7d0rKuqyo8fPwp9TdM4NDRkqf/69Wuh++rVK1E+OjpKkvz69at4lqamJr5//76ip6CcwY7BpFIpNjQ0CG/lixcvhGGbm5uWYJ4+fSrKvV4vk8kkM5kMnz9/LsrPnj0rdh2MjY3p3MXz8/PUNI3pdJrv3r1jNBq1BPPt2zeeOnWKANjc3MyFhYVfulD+NRiSfPjwIQHwypUrdLvdOn+UGZitrS22tLSI8k+fPul2I1y6dEnURaNRbm9v63YlFN2mVlIKxuv18syZM+LHWlxcrMq39FvAJBIJ3TUNDQ1iR4QZmJWVFZ3+xsaG7h4jIyO67Rjl+mtra1WDKU2lrWqnYHY1Kx0/fhyDg4Mif//+fRw9evR/MZs0NTWJz48ePcL6+vqfXflevnxZfD5//nxF3cOHD6OlpUXkl5eXdTPP7OysyDc2NuLIkSO62e3z589VP9fQ0BAePHgAABgdHcXt27exubm5cwN305UqSTWD782bN5lKpZjNZjk+Pq4bfDOZDEny2bNnovzixYuMx+PUNI1ra2sMh8OcnZ21HHy3t7d579493bhT/N7/dIzZDZhMJkOv17uj6bq/v3/X07Wmabx165Yo7+vro6ZpVYPZ/6f6fn19PYaHh3HhwgW8fPkSU1NTSCaTcLlcOHfuHLq7u3Hs2DGhX1dXhzt37sDj8SAYDOLt27dYXl6G2+1GT08P2tvbK96vrq4Og4ODSKfTePz4MXw+Hw4ePIi+vj4cOHDgl89r8F3bdT90OQP5Pka+qJJgJBgJRoKRYCQYCUaCkWAkGCkSjATz28EUCgXbQTCz2QBmty+P97KY2WwA8/37d9uBMbPZAfx9gr0oHz58sB2YUpuLLBwA0NnZKSp8Pp+pg71WZXV1FT6fT+SLLBwA0NbWJipisRiCwaBtwASDQcRiMZEXLOTxYvPjxfJAeqUD6TKEgUUIAxn0okLQCxkmpUKYFBlY56coVjGq7B6KSZHBu8zlLxcPyCg7JJYJAAAAAElFTkSuQmCC",
				supported_formats:["inline_json"],
				supported_formattings:["unformatted"],
				required_fields:[
					//{tag:"user_id"}
					],
				params: [

					]
				}
			]
		}
	}

async function action0Form(req){
	// https://github.com/looker/actions/blob/master/docs/action_api.md#action-form-endpoint
	return [
		{name: "title", label: "Name"},
		{name: "descr", label: "Description", type: "textarea"},
		{name: "value", label: "Value", default:"100"},
		{name: "mode",  label: "Mode", type:"select", options:[
			{name:"Yes", label:"Yes"},
			{name:"No", label:"No"}
			]}
		]
	}

async function action0Execute (req){
	return {}
	}

async function hubStatus(req){
	return {
		validation: {
			callbackUrlPrefix: await check_CALLBACK_URL_PREFIX() || "ok",
			lookerSecret: await check_LOOKER_SECRET() || "ok"
			},
		configuration: {
			callbackUrlPrefix: process.env.CALLBACK_URL_PREFIX,
			},
		function: {
			FUNCTION_TARGET: process.env.FUNCTION_TARGET,
			K_SERVICE: process.env.K_SERVICE,
			K_REVISION: process.env.K_REVISION,
			PORT: process.env.PORT
			},
		services: {
			},
		received: {
			method: req.method,
			path: req.path,
			query: req.query,
			headers: req.headers,
			body: req.body
			}
		}
	}

/*** Implementation for getting a secret ***/
/*	We're using Secret Manager to store secrets
	https://console.cloud.google.com/security/secret-manager
	*/
async function getSecret(name){
	const project = await secrets.getProjectId()
	const [secretVersion] = await secrets.accessSecretVersion({name: `projects/${project}/secrets/${name}/versions/latest`})
	return secretVersion.payload.data.toString()
	}

/*** Check definitions ***/
async function check_LOOKER_SECRET(){
	const lookerSecret = await ASYNC_LOOKER_SECRET
	if(!lookerSecret){
		return "Function is not requiring authentication. Provide a LOOKER_SECRET to require authentication"
		}
	}
function check_CALLBACK_URL_PREFIX(){
	if (!CALLBACK_URL_PREFIX){
		return "CALLBACK_URL_PREFIX is not defined"
		}
	}
