const fs = require('fs')
const path = require('path')

const cloudFunctionPath = '/mock-app'
const port = 8443
Object.entries({
		// Since we're not actually in a GCF, using env variables is fine
		SECRET_WARNING: "I realize GCF's environment variables aren't a secure place to store secrets, since anyone could read them there",
		CALLBACK_URL_PREFIX: `https://localhost:${port}${cloudFunctionPath}`,
		LOOKER_SECRET:"some kinda secret string"
	}).forEach(([k,v]) => {
		process.env[k] = process.env[k] || v
	})

const expectedToken = `Token token="${process.env.LOOKER_SECRET}"`

let httpsOptions
try {
	httpsOptions = {
		key: fs.readFileSync(path.join(__dirname,'./secret/action-self-signed.pem')),
		cert: fs.readFileSync(path.join(__dirname,'./secret/action-self-signed.cert')),
		//passphrase: process.env.PASSPHRASE
		}
	}
catch(e){
	console.error(e)
	console.error("Unable to load HTTPS key/cert. Try `npm run setup-ssl` and use PASSPHRASE env var, if applicable")
	process.exit(1)
	}
	
const express = require('express')
const action = require('../action-examples/01-minimal')
const https = require('https')
const http = require('http')
const oboe = require('oboe')

const app = express()

app.use(
	(req,res,next)=>{ // Strip GCF name from path
		if(req.url.indexOf(cloudFunctionPath)==0 ){
			req.url = req.url.replace(cloudFunctionPath,'')
			next()
			}
		else {
			res.status(400).json(`Path should begin with ${cloudFunctionPath}`)
			} 
		},
	(req,res,next)=>{ // Parse body
		if(req.method=="POST"){
			req.setEncoding('utf8')
			oboe(req).done( value => {
				req.body=value
				next()
				})
			}
		else {next()}
		},	
	(req,res,next) => { //Log request
		console.log(
			`${req.headers.authorization==expectedToken?"[✅Auth]":`[❌Auth\n\n${req.headers.authorization}\n\t${expectedToken}\n]`}`,
			req.method,
			req.path,
			req.query,
			req.body
			)
		next()
	},
	action.httpHandler
	)



console.info(`Starting server at ${process.env.CALLBACK_URL_PREFIX}`)
//http.createServer(app).listen(8080,()=>console.info("HTTP ready on port 8080"))
//if(httpsOptions){
	https.createServer(httpsOptions, app).listen(port,()=>console.info("HTTPS ready on port 8443"))
//	}