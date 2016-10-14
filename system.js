import can from "./can-ejs";

function translate(load) {
	return "define(['can-ejs'],function(module){" +
		"var can = module.default || module;" +
		"return can.view.preloadStringRenderer('" + load.metadata.pluginArgument + "'," +
		'can.EJS(function(_CONTEXT,_VIEW) { ' + new can.EJS({
			text: load.source,
			name: load.name
		})
		.template.out + ' })' +
		")" +
		"})";
}

export default {
	translate: translate
};
