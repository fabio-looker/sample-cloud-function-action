/*** Code Dependencies ***/
const crypto = require("crypto")

const expectedAuthHeader = process.env.EXPECTED_LOOKER_SECRET_TOKEN
	&& `Token token="${process.env.EXPECTED_LOOKER_SECRET_TOKEN}"`
	
if(!expectedAuthHeader){
	console.warn("WARNING: Function is not requiring authentication. Provide EXPECTED_LOOKER_SECRET_TOKEN")
	}
if (!process.env.CALLBACK_URL_PREFIX){
	console.warn("WARNING: CALLBACK_URL_PREFIX is not defined")
	}

exports.httpHandler = async function httpHandler(req,res) {
	try{
		const route = pick(req.path, {
			"/": 				{auth:false,	handler:hubListing},
			"/status": 			{auth:false,	handler:hubStatus},
			"/action0/form": 	{auth:true,		handler:action0Form},
			"/action0/execute": {auth:true,		handler:action0Execute}
			})
		if(!route){
			throw {status:400, body:"Invalid request"}
			}
		if(route.auth && expectedAuthHeader
			&& !timingSafeEqual(req.headers.authorization,expectedAuthHeader)){
			throw {status:401, body:"Authorization required"}
			}
		const resObj = await route.handler(req)
		res.status(200).json(resObj || {})
		}
	catch(err){
		console.error(err)
		res.status( err && err.status || 500 )
			.json(err && err.body || err)
		}
	}

function pick(key,map){return map[key] || map['*'] }

async function hubListing(req){
	// https://github.com/looker/actions/blob/master/docs/action_api.md#actions-list-endpoint
	return {
		integrations: [
			{
				name: "mock-app",
				label: "Mock App",
				supported_action_types: ["cell", "query", "dashboard"],
				form_url:`${process.env.CALLBACK_URL_PREFIX}/action0/form`,
				url: `${process.env.CALLBACK_URL_PREFIX}/action0/execute`,
				icon_data_uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEYAAABGCAYAAABxLuKEAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAMFSURBVHic7Zs9aFNRFMf/56U1rw4tqUJRNMQOtX5s1UnQoYOj4CAVizqZKjgoOAoOgiAuKrTpqFQnxcFBh4KLtZMOOjlom6iVaostmjQxyT0uBoq8E2x7c2+s5ze9cC/nnPx473683ACKoiiKc6he41Im2Q9gEEzbHNUDDqhAwGSYr9ykix+XXOX9E1FMIZM6TuB79fo0mImwM3uIjqHqI3kgNRDxZfiTAgAHSt929PtKLooBY6fDOgSqvb4yy2LqtznBIPBWg/cv36yoGAEVI6BiBFSMQIuNIAS8YqbHFJgZG/FqBKhO2oy3EmyIGYt3Zk/7WqE2irU+Slym8oX1JgVY+x3zqT09M1f7UMqkjhjia2D0wu12IkfgG+FQ7ratgGu9Y8q1i/xwss+AH4CxC+73WEkG3SqMpAZsBbQ2K8UCGoClwXzVEJ+wFcqaGCZ02Yq1WgLCFmuxbAVab6gYARUjoGIEVIyAihHws+5gjBPxdRi8sxnWkCnZiuVDzPNwNnuYrsB4yP3XuBdDGFkuhUf7WvM0v6cFZrOrEkwl+NEW+/ma0jMFqY9zMWw4W7suZZK7izz3KMboYYfbKwoYRW6dL2ZSg+HQ9NOoPl4HXwO6A6DHU/pNAN/n0e6OqEZvYhaGkwkA+3zlBwAGEiWq7I9q8yYmbmLtvnIvxxiKrEPXMQL1xIgj9v9AHTE04a6M5kM+BmLoPIBpd6U0F+I6Jjw39Zbvdu0tFcODYN4e1cdw8L1xpfml7gKPTs7mATxxVEtTobOSgIoRUDECKkZAxQioGAEVI6BiBKyJIcZXW7GaAWtiTICHQHO/4F4J1sRsPJN9AfApMKyew/OF1ZfhbUO5MQBjPNrdsVitRErv+JL7JzaeDfmVgNLvFxsR1yU6KwmoGAEVI6BiBFSMgIoRUDEC/sS0EnvLvRxGZB3exIRIfAbg7Q/nNWIcRJ7q8iaG0i/LRMj4yv+bZxvOTr2JavB69j+eyF5amk99IOKjALa6ykvAAojG4y3xq0TRj5KiKIrigV9fn70/OEgAGwAAAABJRU5ErkJggg==",
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

async function hubStatus(req){
	return {
		canonicalUrl:`${process.env.CALLBACK_URL_PREFIX}`,
		received:{
			method: req.method,
			path: req.path,
			query: req.query,
			headers: req.headers,
			body: req.body
			}
		}
	}

async function action0Form(req,res){
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
	if(req.method !== "POST"){
		throw {status:400, body:"Expected a POST request"}
		}
	return {}
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
