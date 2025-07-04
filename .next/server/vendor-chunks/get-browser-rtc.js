/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/get-browser-rtc";
exports.ids = ["vendor-chunks/get-browser-rtc"];
exports.modules = {

/***/ "(ssr)/./node_modules/get-browser-rtc/index.js":
/*!***********************************************!*\
  !*** ./node_modules/get-browser-rtc/index.js ***!
  \***********************************************/
/***/ ((module) => {

eval("// originally pulled out of simple-peer\n\nmodule.exports = function getBrowserRTC () {\n  if (typeof globalThis === 'undefined') return null\n  var wrtc = {\n    RTCPeerConnection: globalThis.RTCPeerConnection || globalThis.mozRTCPeerConnection ||\n      globalThis.webkitRTCPeerConnection,\n    RTCSessionDescription: globalThis.RTCSessionDescription ||\n      globalThis.mozRTCSessionDescription || globalThis.webkitRTCSessionDescription,\n    RTCIceCandidate: globalThis.RTCIceCandidate || globalThis.mozRTCIceCandidate ||\n      globalThis.webkitRTCIceCandidate\n  }\n  if (!wrtc.RTCPeerConnection) return null\n  return wrtc\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvZ2V0LWJyb3dzZXItcnRjL2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlcyI6WyJEOlxcd2ViRGV2IFByb2plY3RzXFxsaXZlLWFpLWRlYmF0ZS1hcmVuYShJbmNvbXBsZXRlKVxcbm9kZV9tb2R1bGVzXFxnZXQtYnJvd3Nlci1ydGNcXGluZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIG9yaWdpbmFsbHkgcHVsbGVkIG91dCBvZiBzaW1wbGUtcGVlclxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdldEJyb3dzZXJSVEMgKCkge1xuICBpZiAodHlwZW9mIGdsb2JhbFRoaXMgPT09ICd1bmRlZmluZWQnKSByZXR1cm4gbnVsbFxuICB2YXIgd3J0YyA9IHtcbiAgICBSVENQZWVyQ29ubmVjdGlvbjogZ2xvYmFsVGhpcy5SVENQZWVyQ29ubmVjdGlvbiB8fCBnbG9iYWxUaGlzLm1velJUQ1BlZXJDb25uZWN0aW9uIHx8XG4gICAgICBnbG9iYWxUaGlzLndlYmtpdFJUQ1BlZXJDb25uZWN0aW9uLFxuICAgIFJUQ1Nlc3Npb25EZXNjcmlwdGlvbjogZ2xvYmFsVGhpcy5SVENTZXNzaW9uRGVzY3JpcHRpb24gfHxcbiAgICAgIGdsb2JhbFRoaXMubW96UlRDU2Vzc2lvbkRlc2NyaXB0aW9uIHx8IGdsb2JhbFRoaXMud2Via2l0UlRDU2Vzc2lvbkRlc2NyaXB0aW9uLFxuICAgIFJUQ0ljZUNhbmRpZGF0ZTogZ2xvYmFsVGhpcy5SVENJY2VDYW5kaWRhdGUgfHwgZ2xvYmFsVGhpcy5tb3pSVENJY2VDYW5kaWRhdGUgfHxcbiAgICAgIGdsb2JhbFRoaXMud2Via2l0UlRDSWNlQ2FuZGlkYXRlXG4gIH1cbiAgaWYgKCF3cnRjLlJUQ1BlZXJDb25uZWN0aW9uKSByZXR1cm4gbnVsbFxuICByZXR1cm4gd3J0Y1xufVxuIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/get-browser-rtc/index.js\n");

/***/ })

};
;