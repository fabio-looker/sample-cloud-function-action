For easier local development, you can run this script and Node will setup a webserver that imports your module similarly to how Google Cloud Functions would.

Steps:

1. `npm install`
2. Get a locally hosted Looker to trust this ActionHub
	- `npm run setup-ssl` to generate a self signed cert, saved to the `secret` directory
	- Add the self signed cert to your local Java CA bundle that Looker uses:
		`JAVA_HOME=$(/usr/libexec/java_home); sudo keytool -import -alias local-gcf-mock -keystore $JAVA_HOME/jre/lib/security/cacerts -file secret/self-signed.cert`
	- Start/restart Looker
3. `npm run start-dev`
	- This uses nodemon. You can install it if necessary by `npm install -g nodemon`, or just switch the command to use `node` instead
	- This also lets you connect Chrome Dev Tools if you like. Google for a quick tutorial on that
4. Setup & verify the connection from Looker -> the actionHub
	- In your Looker instance, at /admin/actions, add the ActionHub: `https://localhost:8443/cs-app-internal/`
	- For authorization token, enter the value in index.js under EXPECTED_LOOKER_SECRET_TOKEN (TODO: externalize this)
	- You should see 1 Action, enable & test it 	


### Bonus info

- Get this ActionHub to trust Looker
	- Do this step if you want your action to call the Looker API on a locally hosted instance
	- (assumes Looker install at ~/looker)
	- `npm run prep-self-signed-looker`
	- Add a line `127.0.0.1	self-signed.looker.com` to `/etc/hosts`