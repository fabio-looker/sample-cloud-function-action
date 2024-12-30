/*** Demo constants */
const projectId = "your-project-id"
const datasetId = "demo_dataset"
const tableId = "demo_table"

/*** Code Dependencies ***/
const crypto = require("crypto")
const {SecretManagerServiceClient} = require('@google-cloud/secret-manager')
const secrets = new SecretManagerServiceClient()
const BigqueryStorage = require('@google-cloud/bigquery-storage')
const BQSManagedWriter = BigqueryStorage.managedwriter

/*** Load & validate configs ***/
const {
	CALLBACK_URL_PREFIX,
	} = process.env
let cachedLookerSecret

warnIf(check_CALLBACK_URL_PREFIX())
warnIf(check_LOOKER_SECRET())

/*** Entry-point for requests ***/
exports.httpHandler = async function httpHandler(req,res) {
	const routes = {
		"/": [hubListing],
		"/status": [hubStatus], // Debugging endpoint. Not required.
		"/action-0/form": [
			requireInstanceAuth,
			action0Form
			], 
		"/action-0/execute": [
			requireInstanceAuth,
			processRequestBody,
			action0Execute
			]
		}
	
	try {
		const routeHandlerSequence = routes[req.path] || [routeNotFound]
		for(let handler of routeHandlerSequence) {
			let handlerResponse = await handler(req)
			if (!handlerResponse) continue 
			return res
				.status(handlerResponse.status || 200)
				.json(handlerResponse.body || handlerResponse)
			}
		}
	catch(err) {
		console.error(err)
		res.status(500).json("Unhandled error. See GCP Logs for details.")
		}
	}

/*** Definitions for route handler functions ***/
async function hubListing(req){
	// https://github.com/looker/actions/blob/master/docs/action_api.md#actions-list-endpoint
	return {
		integrations: [
			{
				name: "demo-bq-insert",
				label: "Demo BQ Insert",
				supported_action_types: ["cell", "query", "dashboard"],
				form_url:`${process.env.CALLBACK_URL_PREFIX}/action-0/form`,
				url: `${process.env.CALLBACK_URL_PREFIX}/action-0/execute`,
				icon_data_uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEYAAABGCAYAAABxLuKEAAAFgklEQVR42u2cTWgTWxTH/xOV2kVF0VUpLrLoosK46KZNUaw1FBrUhQuXLty4bfzAQj8ExZRu1Y2LigsbspIWNxVirFJIbVIxtAErFqNgoUkhpW0ytkn+b/FerpnMTEz7fPKauQcu5N57JjPnl/uVOfcehSQhxSD7rSry+TxisRii0SjC4TBCoRCWlpb2tLFOpxOdnZ1oa2tDa2srVFXFvn37zJVpIpFIhL29vQRQ06m3t5eRSMQMAXVgstksJyYmah5IeZqYmGA2m7UGYwVFVVX6/X7G43Gm02nm83nuFcnn80yn04zH4/T7/VRV1RKOKZhIJGJ6QSAQYCqVYq1IKpViIBAwtbW0W4Ekc7mcYUzxeDycnp5mrcr09DQ9Ho9hzMnlcj/BzM3NGejVMpRSOOV2z83NkSQdABCNRnUzVSAQgMvlqvm1isvlQiAQ0JUVWTgAIBwOiwpVVdHV1WWbhVxXVxdUVRV5wYIknU6naEp+v592E7/fL+x3Op0/u1LpivbkyZO2W/6X2lxk4ShXamxstB0YM5sVklQURfcfyeFw2ApMoVDQ/WciaWwxdoNiZbP9KFQLSyKQYCQYCUaCkWAkGAlGgpFgJBgJZo9LKBSCoihQFAVPnjz5M2AWFhbETYspmUwa9JaWlgx6iUTCXi1mcnLSUDY+Pi670t27d7GxsSHyyWQSXq/XvmA8Hg9UVcXi4iLevHljaEHFeivJ5XKYmprCwMAATp8+jRMnTuDq1asYGxvD6uqqQb9QKGBmZgY+nw89PT1obW3FjRs3EAqFsLW19cvnTSQSaG9vh6IoOHToEGZmZqo39p/9MSKVy/z8vKi7du2aeKPudrv548cPrq+vs7m5mQA4OTnJjo4Oof/lyxfxPZlMhtevX7d0rKuqyo8fPwp9TdM4NDRkqf/69Wuh++rVK1E+OjpKkvz69at4lqamJr5//76ip6CcwY7BpFIpNjQ0CG/lixcvhGGbm5uWYJ4+fSrKvV4vk8kkM5kMnz9/LsrPnj0rdh2MjY3p3MXz8/PUNI3pdJrv3r1jNBq1BPPt2zeeOnWKANjc3MyFhYVfulD+NRiSfPjwIQHwypUrdLvdOn+UGZitrS22tLSI8k+fPul2I1y6dEnURaNRbm9v63YlFN2mVlIKxuv18syZM+LHWlxcrMq39FvAJBIJ3TUNDQ1iR4QZmJWVFZ3+xsaG7h4jIyO67Rjl+mtra1WDKU2lrWqnYHY1Kx0/fhyDg4Mif//+fRw9evR/MZs0NTWJz48ePcL6+vqfXflevnxZfD5//nxF3cOHD6OlpUXkl5eXdTPP7OysyDc2NuLIkSO62e3z589VP9fQ0BAePHgAABgdHcXt27exubm5cwN305UqSTWD782bN5lKpZjNZjk+Pq4bfDOZDEny2bNnovzixYuMx+PUNI1ra2sMh8OcnZ21HHy3t7d579493bhT/N7/dIzZDZhMJkOv17uj6bq/v3/X07Wmabx165Yo7+vro6ZpVYPZ/6f6fn19PYaHh3HhwgW8fPkSU1NTSCaTcLlcOHfuHLq7u3Hs2DGhX1dXhzt37sDj8SAYDOLt27dYXl6G2+1GT08P2tvbK96vrq4Og4ODSKfTePz4MXw+Hw4ePIi+vj4cOHDgl89r8F3bdT90OQP5Pka+qJJgJBgJRoKRYCQYCUaCkWAkGCkSjATz28EUCgXbQTCz2QBmty+P97KY2WwA8/37d9uBMbPZAfx9gr0oHz58sB2YUpuLLBwA0NnZKSp8Pp+pg71WZXV1FT6fT+SLLBwA0NbWJipisRiCwaBtwASDQcRiMZEXLOTxYvPjxfJAeqUD6TKEgUUIAxn0okLQCxkmpUKYFBlY56coVjGq7B6KSZHBu8zlLxcPyCg7JJYJAAAAAElFTkSuQmCC",
				supported_formats:["inline_json"],
				supported_formattings:["unformatted"],
				required_fields:[
					// You can use this to make your action available for specific queries/fields
					//{tag:"user_id"}
					],
				params: [
					// You can use this to require parameters, either from the Action's administrative configuration,
					// or from the invoking user's user attributes. A common use case might be to have the Looker
					// instance pass along the user's identification to allow you to conditionally authorize the action:
					{name: "email", label: "Email", user_attribute_name: "email", required: true}
					]
				}
			]
		}
	}

async function action0Form(req){
	// The `form` response defines what information, if any, will be prompted from the user invoking/scheduling the Action
	// https://github.com/looker/actions/blob/master/docs/action_api.md#action-form-endpoint
	return [
		{name: "choice",  label: "Choose", type:"select", options:[
			{name:"Yes", label:"Yes"},
			{name:"No", label:"No"},
			{name:"Maybe", label:"Maybe"}
			]},
		{name: "note", label: "Note", type: "textarea"}
		]
	}

async function action0Execute (req){
	// Our action will insert a new row into our pre-determined BQ Table
	try{
		// Prepare some data that we will insert
		const scheduledPlanId = req.body.scheduled_plan && req.body.scheduled_plan.scheduled_plan_id
		const formParams = req.body.form_params || {}
		const actionParams = req.body.data || {}
		const queryData = req.body.attachment.data //If using a standard "push" action


		// In case any fields require datatype-specific preparation, check this example:
		// https://github.com/googleapis/nodejs-bigquery-storage/blob/main/samples/append_rows_proto2.js

		const newRow = {
			invoked_at: new Date(),
			invoked_by: actionParams.email,
			scheduled_plan_id: scheduledPlanId || null,
			query_result_size: queryData.length,
			choice: formParams.choice,
			note: formParams.note,
			}
		await bigqueryConnectAndAppend(newRow)

		return {status: 200, body: {
			looker:{
				success:true,
				refresh_query: true, // Useful with "cell"-type actions
				message:`Inserted new row`
				}
			}}
		}
	catch (e) {
		console.error(e)
		return {status:500, body:{
			looker:{
				success: false,
				message: `An unhandled error occurred inserting new data into BigQuery. See GCP logs for more details.`
				}
			}}
		}
	}


async function bigqueryConnectAndAppend(row){
	// The logic/sequence of steps to connect and write to a table is a bit long, so we encapsulate
	// it here to be able to use it consistently both in our execute route and in our status route.
	// Following the same steps as documented at https://cloud.google.com/bigquery/docs/write-api-streaming
	
	let writerClient
	try{
		const destinationTablePath = `projects/${projectId}/datasets/${datasetId}/tables/${tableId}`
		const streamId = `${destinationTablePath}/streams/_default`
		writerClient = new BQSManagedWriter.WriterClient({projectId})
		const writeMetadata = await writerClient.getWriteStream({
			streamId,
			view: 'FULL',
			})
		const protoDescriptor = BigqueryStorage.adapt.convertStorageSchemaToProto2Descriptor(
			writeMetadata.tableSchema,
			'root'
			)
		const connection = await writerClient.createStreamConnection({
			streamId,
			destinationTablePath,
			})
		const writer = new BQSManagedWriter.JSONWriter({
			streamId,
			connection,
			protoDescriptor,
			})

		let result
		if(row){
			// The API expects an array of rows, so wrap the single row in an array
			const rowsToAppend = [row]
			result = await writer.appendRows(rowsToAppend).getResult()
			}
		return {
			streamId: connection.getStreamId(),
			protoDescriptor,
			result
			}
		}
	catch (e) {throw e}
	finally{
		if(writerClient){writerClient.close()}
		}
	}

async function hubStatus(req){
	const timeoutInSeconds = 5
	const asyncTimeout = new Promise((resolve,reject)=>setTimeout(
		reject,
		timeoutInSeconds*1000,
		`Downstream service timed out (${timeoutInSeconds}s)`
		))
	const asyncLookerSecretStatus = check_LOOKER_SECRET()
	const asyncBigQueryStatus = getBqStatus()
	const [lookerSecretStatus,bigQuery] = await Promise.all([
		Promise.race([asyncTimeout, asyncLookerSecretStatus]).catch(err => err.message || err),
		Promise.race([asyncTimeout, asyncBigQueryStatus]).catch(err => err.message || err)
		])
	return {
		validation: {
			callbackUrlPrefix: check_CALLBACK_URL_PREFIX() || "ok",
			lookerSecret: lookerSecretStatus || "ok"
			},
		configuration: {
			callbackUrlPrefix: CALLBACK_URL_PREFIX,
			},
		function: {
			FUNCTION_TARGET: process.env.FUNCTION_TARGET,
			K_SERVICE: process.env.K_SERVICE,
			K_REVISION: process.env.K_REVISION,
			PORT: process.env.PORT
			},
		services: {
			bigQuery
			},
		received: {
			method: req && req.method,
			path: req && req.path,
			query: req && req.query,
			headers: req && req.headers,
			body: req && req.body
			}
		}
	}

async function getLookerSecret(){
	/*** Implementation for getting a secret ***/
	/*	We're using Secret Manager: https://console.cloud.google.com/security/secret-manager
		Below is a somewhat manual way to do this for demo purposes, however a more convenient approach
		may be to use Cloud Run Functions' built-in functionality to retrieve a secret for you during 
		its spin-up: https://cloud.google.com/functions/docs/configuring/secrets#environment_variables
		*/
	if(cachedLookerSecret){return cachedLookerSecret}
	const project = await secrets.getProjectId()
	const name = "LOOKER_SECRET"
	const [secretVersion] = await secrets.accessSecretVersion({name: `projects/${project}/secrets/${name}/versions/latest`})
	cachedLookerSecret = secretVersion.payload.data.toString()
	return cachedLookerSecret
	}

/*** Check definitions ***/
async function check_LOOKER_SECRET(){
	try{
		const lookerSecret = await getLookerSecret()
		if(!lookerSecret){
			return "Function is not requiring authentication. Provide a LOOKER_SECRET value to require authentication"
			}
		}
	catch(e){
		console.error(e)
		return "Unable to connect to Secret Manager to retrieve LOOKER_SECRET. See logs for details."
		}
	}
function check_CALLBACK_URL_PREFIX(){
	if (!CALLBACK_URL_PREFIX){
		return "CALLBACK_URL_PREFIX is not defined"
		}
	}

async function getBqStatus() {
	try{
		const {streamId, protoDescriptor} = await bigqueryConnectAndAppend()
		return {
			status: 'ok',
			streamId,
			protoDescriptor
			}
		}
	catch(e){
		console.error('BQ Status check error', e)
		return "Error connecting to BQ. See logs for details"
		}
	}

async function warnIf(strOrPromise){
	let str = await strOrPromise
	if(str){console.warn(`WARNING: ${str}`)}
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
	
	function tryJsonParse(str, dft) {
		try{return JSON.parse(str)}
		catch(e){return dft}
		}
	}

async function requireInstanceAuth(req) {
	const lookerSecret = await getLookerSecret()
	if(!lookerSecret){return}
	const expectedAuthHeader = `Token token="${lookerSecret}"`
	if(!timingSafeEqual(req.headers.authorization,expectedAuthHeader)){
		return {
			status:401,
			body: {error: "Looker instance authentication is required"}
			}
		}
	return

	function timingSafeEqual(a, b) {
		if(typeof a !== "string"){return}
		if(typeof b !== "string"){return}
		var aLen = Buffer.byteLength(a)
		var bLen = Buffer.byteLength(b)
		const bufA = Buffer.allocUnsafe(aLen)
		bufA.write(a)
		const bufB = Buffer.allocUnsafe(aLen) //Yes, aLen
		bufB.write(b)

		return crypto.timingSafeEqual(bufA, bufB) && aLen === bLen;
		}
	}

function routeNotFound() {
	return {
		status:400,
		body: "Invalid request"
		}
	}
	