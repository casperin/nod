var $;

$ = 'boo';

jQuery(function() {
  var ff, fn, g, metrics, options, regex;
  fn = function(v) {
    if (v === "") {
      return false;
    }
    return v % 2 === 0;
  };
  g = function(v) {
    return jQuery.get('dev/resp.txt', v);
  };
  regex = /foo/;
  metrics = [['[name=a]', 'presence', 'pres err'], ['#bar', 'not:a1', 'You must click on *this* radio button'], ['#one', 'email', 'email'], ['#two', 'presence', 'em']];
  ff = function(event, data) {
    return console.log(data);
  };
  jQuery("#form").on('silentSubmit', ff);
  options = {
    silentSubmit: true
  };
  return jQuery("#form").nod(metrics, options);
});
