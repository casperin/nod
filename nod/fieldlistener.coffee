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
    @$el.status = true                       # We assume field to be okname
    @type = @$el.attr 'type'
    @checkField = @createChecker @$el        # We can build it from $el
    @events()


  events : =>
    if @type is 'radio'                      # Listen to all with same name
      jQuery( '[name='+@$el.attr("name")+']' ).on 'change', @runCheck
    else
      @$el.on 'change', @runCheck            # For checkboxes and select fields
      @$el.on 'blur',   @runCheck            # On blur we run the check intantly
      unless @delay is false
        @$el.on 'keyup',  @delayedCheck      # delayed check on keypress 


  delayedCheck: =>
    clearTimeout @delayId                    # Cancel the previous delayed check
    @delayId = setTimeout @runCheck, @delay  # Create new setTimeout


  runCheck: =>
    isCorrect = @checkField()                # Bool
    if @$el.status == isCorrect then return  # Stop if nothing changed
    @$el.status = isCorrect                  # Set the new status
    @$el.trigger 'nod_toggle'                # Tell world that status changed


  createChecker : ( $el ) =>                 # Returns a function
    if @type is 'checkbox'                   # If it's a checkbox we don't care
      -> @checker $el.is ':checked'          # about the value.
    else if @type is 'radio'                 # Radio we ignore it if it isn't
      -> !$el.is( ':checked' ) or            # checked.
          $el.is( ':checked' ) is @checker $el.val()      # Else we check it
    else
      -> @checker jQuery.trim $el.val()      # Text fields, etc, we want the val

