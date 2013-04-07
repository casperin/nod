# This class handles building, showing, and hiding the error message. It is run
# directly by its listener (1 to 1 relationship), and either shows or hides the
# message depending on the status passed along.
#
class NodMsg

  constructor: ( @$el, @get, msg ) ->
    @$msg = @createMsg msg                    # create the element
    @showMsg = @createShowMsg()               # Create fn to show @$msg


  createMsg : ( msg ) =>                      # Returns the el we toggle
    jQuery '<span/>',
      'html'  : msg
      'class' : @get.helpSpanDisplay + ' ' + @get.errorClass


  toggle : ( status ) =>                      # Called from it listener
    if status                                 # No errors
      @$msg.remove()
    else                                      # Errors
      @showMsg()
      @broadcast() if @broadcastError         # Not used internally


  createShowMsg : =>                          # Returns a fn that shows @$msg
    type = @$el.attr( 'type' )
    if type is 'checkbox' or type is 'radio'
      -> @$el.parent().append @$msg           # If checkbox, append to parent
    else
      pos = @findPos @$el                     # Returns el before our @$msg
      -> pos.after @$msg


  findPos : ( $el ) ->                        # Double recursive fn <3
    if @elHasClass 'parent', $el
      return @findPos $el.parent()
    if @elHasClass 'next', $el                # If next el has one of pos class
      return @findPos $el.next()              # then we run it again.
    $el                                       # Else, we just return the el


  elHasClass : ( dir, $el ) ->
    for s in @get.errorPosClasses
      if $el[ dir ]( s ).length               # If the next el has one of the
        return true                           # classes in @pos_classes, we
    false                                     # return true and do it again


  broadcast : ->                              # Not used internally at all
    jQuery( window ).trigger 'nod_error_fired',
      el  : @$el
      msg : @$msg.html()
