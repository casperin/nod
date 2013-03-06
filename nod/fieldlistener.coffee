# One of these for every nod that is put on a field. One field can have more
# than one nods, and one rule can also be applied to several fields (using
# general selectors) so also here we get more nods: one for each field it
# applies to.
#
# This basically listens for changes in the field, and changes its status
# accordingly while broadcasting it via trigger()
#
class FieldListener

  constructor: ( @$el, vars ) ->
    [ @checker, @delay ] = vars              # A function and an int
    @delayId  = ""                           # So we can cancel delayed checks
    @getVal   = @createGetValue @$el         # We can build it from $el
    @events()


  events : =>
    @$el.on 'keyup',   @delayedCheck         # we delay the check on keypresses
    @$el.on 'blur',    @runCheck             # On blur we run the check intantly
    @$el.on 'change',  @runCheck             # For checkboxes and select fields


  delayedCheck: =>
    clearTimeout @delayId                    # Cancel the previous delayed check
    @delayId = setTimeout @runCheck, @delay  # Create new setTimeout


  runCheck: =>
    isCorrect = @checker @getVal()           # Bool

    if @$el.status != isCorrect              # Stop if nothing changed
      @$el.status   = isCorrect              # Set the new status
      @$el.trigger 'toggle'                  # Tell world that status changed


  createGetValue : ( $el ) =>                # Returns a function
    if $el.attr( 'type' ) is 'checkbox'      # If it's a checkbox we don't care
      -> $el.is ':checked'                   # about the value
    else
      -> $.trim $el.val()                    # Text fields, etc, we want the val

