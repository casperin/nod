# This class handles building, showing, and hiding the error message. It is run
# directly by its listener (1 to 1 relationship), and either shows or hides the
# message depending on the status passed along.
#
class Msg

  constructor: ( @$el, @get, field ) ->
    @$msg = @createMsg field[ 2 ]             # create the element
    @showMsg = @createShowMsg()               # Create fn to show @$msg


  createMsg : ( msg ) =>                      # Returns the el we toggle
    $ '<span/>',
      'html'  : msg
      'class' : @get.helpSpanDisplay + ' ' + @get.errorClass


  # Called from its listener whenever the status changes.
  # status == true, means no errors.
  toggle : ( status ) =>
    if status                                 # No errors
      @$msg.remove()
    else                                      # Errors
      @showMsg()
      @broadcast() if @get.broadcastError     # Not used internally


  # We need to know the type of the input field before we know where to place
  # the error message.
  createShowMsg : =>                          # Returns a fn that shows @$msg
    type = @$el.attr( 'type' )
    if type is 'checkbox' or type is 'radio'
      -> @$el.parent().append @$msg           # If checkbox, append to parent
    else
      # We need to find the element immediately before where we want our error
      # message to be. For instance we want to skip over add-ons,
      # .help-inline's, buttons, etc.
      pos = @findPos @$el                     # Returns el before our @$msg
      -> pos.after @$msg


  findPos : ( $el ) ->
    if @elHasClass 'parent', $el              # Check if we should go up the
      return @findPos $el.parent()            # dom tree.
    if @elHasClass 'next', $el                # If next el has one of pos class
      return @findPos $el.next()              # then we run it again.
    return $el                                # Else, we just return the el


  # Helper fn used but findPos(), to determine if a parent or next element hs
  # has one of the classes defined in @get.errorPosClasses.
  # Returns a boolean.
  elHasClass : ( dir, $el ) ->                # dir = 'parent' or 'next'
    for sel in @get.errorPosClasses
      if $el[ dir ]( sel ).length
        return true                           # if el matches a selector
    return false                              # if no el matches the selectors


  # This can be turned on by the user to listen for errors if they want to log
  # them, etc. It triggers an event on the window with an object describing
  # the nature of the error.
  broadcast : ->                              # Not used internally at all
    $( window ).trigger 'nod_error_fired',
      el  : @$el
      msg : @$msg.html()
