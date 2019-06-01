const fs = require('fs');
const path = require('path');

const template = fs.readFileSync(path.join(__dirname + "/../", "template.html")).toString();
const constructs = require('../constructs/constructs.config');

module.exports = function format(string, vars = {}) {
	string = string.toString();

	return formatStep(template.replace("#content#", string), vars, 0);
};

function formatStep(string, vars, depth = 0) {
	let output = string;

	output = output.replace(/(#=.+#)/g, match => eval(`(function () {
		${Object.keys(vars).map(i => (_var => `const ${i} = ${typeof _var ? "'" + _var.replace(/'/g, '\\\'') + "'" : _var}`)(vars[i] || "")).join('\n')}
		let retVal = "";
		try {
			retVal = ${match.match(/(?<=#=)(.+)(?=#)/)[0]}
		} catch (e) {
			retVal = "";
		}		
		return retVal || "undefined";
	})()`));

	Object.keys(constructs).forEach(i => {
		const regex = new RegExp(`(?<!\\\\)#${i}(?:\\((.[^,]+?)(?:,\\s*(.[^,]+?))*?\\))?(?!\\\\)#`, 'g');
		output = output.replace(regex, match => constructs[i](match.slice(match.indexOf('(') + 1, match.lastIndexOf(')')).split(/,\s*/).map(i => i[0] === "~" ? vars[i.slice(1)] : i)));
	});

	output = output.replace(/(?<!\\)#.*(?<!\\)#/g, match => { // /(?<!\\)#.[^()]+?(?!\(.+?\))(?!\\)#/g
		const fileName = path.join('./constructs', 'snippets', match.slice(1, -1));

		if (fs.existsSync(fileName)) {
			return fs.readFileSync(fileName).toString();
		} else
			return `The file "${match.slice(1, -1)}" does not exist`;
	});

	if (/(?<!\\)#.*(?<!\\)#/g.test(output))
		return formatStep(output, vars, depth + 1);

	return output.replace(/\\#/g, '#'); // test whether output contains unescaped constructs: /(?<!\\)#.*(?<!\\)#/g.test(output)
}