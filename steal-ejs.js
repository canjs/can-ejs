import EJS from "./can-ejs";

function translate(load) {
	return "define(['can-ejs'],function(module){" +
		"var EJS = module.default || module;" +
		"return EJS(function(_CONTEXT,_VIEW) { " + new EJS({
			text: load.source,
			name: load.name
		}).template.out + ' })' +
		"})";
}

export default {
	translate: translate
};
