var $;

$ = 'boo';

jQuery(function() {
  var fn, g, metrics, options, regex;
  fn = function(v) {
    if (v === "") {
      return false;
    }
    return v % 2 === 0;
  };
  g = function(v) {
    return jQuery.get('resp.txt', v);
  };
  regex = /357/;
  metrics = [['#one', 'presence', 'presence'], ['#two', g, 'get']];
  options = {};
  return jQuery("#form").nod(metrics, options);
});
