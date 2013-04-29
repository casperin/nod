# This listens for changes in the field, and changes its status
# accordingly while broadcasting it via trigger()
#
class Listener

  constructor: ( el, @get, @field ) ->
    @$el      = jQuery el
    @delayId  = ""                            # So we can cancel delayed checks
    @status   = true                          # We assume field to be ok
    @checker  = new Checker @$el, @field      # Run this to check a field
    @msg      = new Msg     @$el, @get, @field # Toggles showing/hiding msgs
    @events()                                 # Listen for changes on element


  events : =>
    if @$el.attr( 'type' ) is 'radio'         # Listen to all with same name
      jQuery( '[name="'+@$el.attr("name")+'"]' ).on 'change', @runCheck
    else
      @$el.on 'change', @runCheck             # For checkboxes and select fields
      @$el.on 'blur'  , @runCheck             # On blur we run the check
      if @field[ 1 ] is 'one-of'
        jQuery( window ).on 'nod-run-one-of', @runCheck
      if @get.delay
        @$el.on 'keyup' , @delayedCheck       # delayed check on keypress


  delayedCheck: =>
    clearTimeout @delayId                     # Cancel the previous delay check
    @delayId = setTimeout @runCheck, @get.delay  # Create new setTimeout


  runCheck: =>
    # Uses method described at http://api.jquery.com/deferred.then/ to
    # accomodate ajax callbacks
    jQuery
      .when( @checker.run() )
      .then( @change_status )


  change_status : ( status ) =>
    isCorrect = !!status                      # Bool
    return if @status is isCorrect            # Stop if nothing changed
    @status = isCorrect                       # Set the new status
    @msg.toggle @status                       # toggle msg with new status
    jQuery( @ ).trigger 'nod_toggle'          # Triggers check on submit btn
                                              # and .control-group
    if @field[ 1 ] is 'one-of' and status
      jQuery( window ).trigger 'nod-run-one-of'
