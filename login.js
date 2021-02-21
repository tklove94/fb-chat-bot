require('dotenv').config();
const fs = require("fs-extra");
const login = require("fca-unofficial");
const readline = require("readline");
const totp = require("totp-generator");
const cmd = require("node-cmd");

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const option = {
	logLevel: "silent",
	forceLogin: true,
	userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.104 Safari/537.36"
};

//Hãy điền tài khoản và mật khẩu vào file .env sau khi đã đổi .env.example thành .env
const obj = {
	email: process.env.EMAIL,
	password: process.env.PASSWORD
};

var langText = {};
var langFile = (fs.readFileSync(`./app/handle/src/langs/${process.env.LANGUAGE}.lang`, { encoding: 'utf-8' })).split(/\r?\n|\r/);
var langData = langFile.filter(item => item.indexOf('#') != 0 && item.indexOf('login.') == 0);
for (let item of langData) {
	let getSeparator = item.indexOf('=');
	let itemKey = item.slice(0, getSeparator);
	let itemValue = item.slice(getSeparator + 1, item.length);
	let head = itemKey.slice(0, itemKey.indexOf('.'));
	let key = itemKey.replace(head + '.', '');
	let value = itemValue.replace(/\\n/gi, '\n');
	langText[key] = value;
}

function getText(...args) {
	const getKey = args[0];
	if (!langText.hasOwnProperty(getKey)) throw `${__filename} - Not found key language: ${getKey}`;
	let text = langText[getKey];
	for (let i = args.length; i > 0; i--) {
		let regEx = RegExp(`%${i}`, 'g');
		text = text.replace(regEx, args[i]);
	}
	return text;
}

login(obj, option, (err, api) => {
	if (err) {
		switch (err.error) {
			case "login-approval":
				if (process.env.OTPKEY) err.continue(totp(process.env.OTPKEY));
				else {
					console.log(getText('2fa'));
					rl.on("line", line => {
						err.continue(line);
						rl.close();
					});
				}
				break;
			case 'Wrong username/password.':
				console.error(getText('wrongAorP'));
				break;
			default:
				console.error(err.error);
		}
		return;
	}
	var json = JSON.stringify(api.getAppState(), null, "\t");
	var addNew = fs.createWriteStream(__dirname + "/appstate.json", { flags: "w" });
	addNew.write(json);
	console.log(getText('appstate'));
	(process.env.API_SERVER_EXTERNAL == 'https://api.glitch.com') ? cmd.run('refresh') : cmd.run('pm2 reload 0');
});
