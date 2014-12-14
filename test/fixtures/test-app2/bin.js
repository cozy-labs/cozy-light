
var application = require(__dirname+'/application.js');

var options = {port:8080};
var app = application(options);
app.listen(options.port, function (err) {
  console.log("started")
});