# Returns a function that checks the value of a field and returns true if no
# errors, and otherwise false
#
class Checker
  constructor : ( $el, @metric ) ->

    @getVal = @makeGetVal $el

  # Called from outside. This function returns a boolean
  run : =>
    @verify @metric, @getVal()


  makeGetVal : ( $el ) ->
    type = $el.attr 'type'
    if type is 'checkbox'                   # If it's a checkbox we don't care
      -> $el.is ':checked'                  # about the value.
    else if type is 'radio'
      if $el.attr("name") isnt ""           # if the radio button has a name
        sel = '[name='+$el.attr('name')+']'
        group = jQuery( sel )               # gather all buttons in its group
        if group.size() > 1                 # if there is a group
          checked = group.filter ':checked'
          return -> checked.val() || ""     # validate checked radios in group

      ->                                    # fallback in case of improper use
        if $el.is ':checked' then $el.val()
        else ""
    else
      -> jQuery.trim $el.val()


  verify : ( m , v ) ->     # metric, value

    if !!(m && m.constructor && m.call && m.apply)  # If user passes a fn, then
      return m v                                    # we just return that.

    if m instanceof RegExp                    # If user passes a regexp, then
      return m.test v                         # we use that for testing.

    [ type, arg, sec ] = jQuery.map m.split( ':' ) , jQuery.trim

    if type == 'same-as' && jQuery( arg ).length != 1    # Special case
      throw new Error 'same-as selector must target one and only one element'

    switch type
      when 'presence'     then !!v
      when 'exact'        then !v or v == arg
      when 'not'          then !v or v != arg
      when 'same-as'      then !v or v == jQuery( arg ).val()
      when 'min-num'      then !v or +v >= +arg
      when 'max-num'      then !v or +v <= +arg
      when 'between-num'  then !v or +v >= +arg and +v <= +sec
      when 'min-length'   then !v or v.length >= +arg
      when 'max-length'   then !v or v.length <= +arg
      when 'exact-length' then !v or v.length == +arg
      when 'between'      then !v or v.length >= +arg and v.length<=+sec
      when 'integer'      then !v or ( /^\s*\d+\s*$/ ).test v
      when 'float'        then !v or ( /^[-+]?[0-9]+(\.[0-9]+)?$/ ).test v
      when 'email'        then !v or @email v
      else throw new Error 'I don\'t know ' + type + ', sorry.'

  email : ( v ) ->
    RFC822 = /// ^ (
      [^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+
      | \x22([^\x0d\x22\x5c\x80-\xff]
      | \x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a
      -\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+
      | \x22([^\x0d\x22\x5c\x80-\xff]
      | \x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a
      -\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+
      | \x5b([^\x0d\x5b-\x5d\x80-\xff]
      | \x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a
      -\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+
      | \x5b([^\x0d\x5b-\x5d\x80-\xff]
      | \x5c[\x00-\x7f])*\x5d))*$
    ///
    RFC822.test v

