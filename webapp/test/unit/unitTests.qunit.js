/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"com/wec/hr/u135/ZHR_WSM_UI35/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});