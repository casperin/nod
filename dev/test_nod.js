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
  metrics = [['#two', 'presence', 'em'], ['#one', g, 'get']];
  ff = function(event, data) {
    return console.log(data);
  };
  jQuery("#form").on('silentSubmit', ff);
  options = {
    silentSubmit: true
  };
  return jQuery("#form").nod(metrics, options);
});
