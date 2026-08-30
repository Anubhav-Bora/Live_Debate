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

eval("// originally pulled out of simple-peer\n\nmodule.exports = function getBrowserRTC () {\n  if (typeof globalThis === 'undefined') return null\n  var wrtc = {\n    RTCPeerConnection: globalThis.RTCPeerConnection || globalThis.mozRTCPeerConnection ||\n      globalThis.webkitRTCPeerConnection,\n    RTCSessionDescription: globalThis.RTCSessionDescription ||\n      globalThis.mozRTCSessionDescription || globalThis.webkitRTCSessionDescription,\n    RTCIceCandidate: globalThis.RTCIceCandidate || globalThis.mozRTCIceCandidate ||\n      globalThis.webkitRTCIceCandidate\n  }\n  if (!wrtc.RTCPeerConnection) return null\n  return wrtc\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvZ2V0LWJyb3dzZXItcnRjL2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlcyI6WyJFOlxcTGl2ZV9EZWJhdGVcXG5vZGVfbW9kdWxlc1xcZ2V0LWJyb3dzZXItcnRjXFxpbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBvcmlnaW5hbGx5IHB1bGxlZCBvdXQgb2Ygc2ltcGxlLXBlZXJcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZXRCcm93c2VyUlRDICgpIHtcbiAgaWYgKHR5cGVvZiBnbG9iYWxUaGlzID09PSAndW5kZWZpbmVkJykgcmV0dXJuIG51bGxcbiAgdmFyIHdydGMgPSB7XG4gICAgUlRDUGVlckNvbm5lY3Rpb246IGdsb2JhbFRoaXMuUlRDUGVlckNvbm5lY3Rpb24gfHwgZ2xvYmFsVGhpcy5tb3pSVENQZWVyQ29ubmVjdGlvbiB8fFxuICAgICAgZ2xvYmFsVGhpcy53ZWJraXRSVENQZWVyQ29ubmVjdGlvbixcbiAgICBSVENTZXNzaW9uRGVzY3JpcHRpb246IGdsb2JhbFRoaXMuUlRDU2Vzc2lvbkRlc2NyaXB0aW9uIHx8XG4gICAgICBnbG9iYWxUaGlzLm1velJUQ1Nlc3Npb25EZXNjcmlwdGlvbiB8fCBnbG9iYWxUaGlzLndlYmtpdFJUQ1Nlc3Npb25EZXNjcmlwdGlvbixcbiAgICBSVENJY2VDYW5kaWRhdGU6IGdsb2JhbFRoaXMuUlRDSWNlQ2FuZGlkYXRlIHx8IGdsb2JhbFRoaXMubW96UlRDSWNlQ2FuZGlkYXRlIHx8XG4gICAgICBnbG9iYWxUaGlzLndlYmtpdFJUQ0ljZUNhbmRpZGF0ZVxuICB9XG4gIGlmICghd3J0Yy5SVENQZWVyQ29ubmVjdGlvbikgcmV0dXJuIG51bGxcbiAgcmV0dXJuIHdydGNcbn1cbiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/get-browser-rtc/index.js\n");

/***/ })

};
;