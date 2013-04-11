# Returns a function that checks the value of a field and returns true if no
# errors, and otherwise false
#
class Checker
  constructor : ( $el, metric ) ->

    @checker = @makeChecker $el, @makeValidator metric


  run : => @checker()


  makeChecker : ( $el, validator ) =>       # Returns a function
    type = $el.attr 'type'
    if type is 'checkbox'                   # If it's a checkbox we don't care
      -> validator $el.is ':checked'        # about the value.
    else if type is 'radio'                 # Radio
      if $el.attr("name") isnt ""           # if the radio button has a name
        -> validator jQuery( '[name='+$el.attr("name")+']:checked' ).val()  # Check if any radio button in its group is checked and run the validations
      else                                  # if it doesn't have a name
        -> !$el.is( ':checked' ) or         # we ignore it if it isn't checked.
            $el.is( ':checked' ) is validator $el.val()      # Else we check it
    else
      -> validator jQuery.trim $el.val()    # Text fields, etc, we want the val


  makeValidator : ( m ) ->                  # m = 'max-length:8'

    if !!(m && m.constructor && m.call && m.apply)  # If user passes a fn, then
      return (v) -> m v                             # we just return that.

    if m instanceof RegExp                    # If user passes a regexp, then
      return (v) -> m.test v                  # we use that for testing.

    [ type, arg, sec ] = jQuery.map m.split( ':' ) , jQuery.trim

    if type == 'same-as' && jQuery( arg ).length != 1    # Special case
      throw new Error 'same-as selector must target one and only one element'

    switch type
      when 'presence'     then (v) -> !!v
      when 'exact'        then (v) -> !v or v == arg
      when 'not'          then (v) -> !v or v != arg
      when 'same-as'      then (v) -> !v or v == jQuery(arg).val()
      when 'min-num'      then (v) -> !v or +v >= +arg
      when 'max-num'      then (v) -> !v or +v <= +arg
      when 'between-num'  then (v) -> !v or +v >= +arg and +v <= +sec
      when 'min-length'   then (v) -> !v or v.length >= +arg
      when 'max-length'   then (v) -> !v or v.length <= +arg
      when 'exact-length' then (v) -> !v or v.length == +arg
      when 'between'      then (v) -> !v or v.length >= +arg and v.length<=+sec
      when 'integer'      then (v) -> !v or (/^\s*\d+\s*$/).test v
      when 'float'        then (v) -> !v or (/^[-+]?[0-9]+(\.[0-9]+)?$/).test v
      when 'email'        then (v) -> !v or (/^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/).test v # RFC822
      else throw new Error 'I don\'t know ' + type + ', sorry.'
