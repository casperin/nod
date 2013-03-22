# This class handles building, showing, and hiding the error message. It
# listens for changes in the toggle (by fieldlistener), checks status and
# either shows or hides the message
#
class NodMsg

  constructor: ( @$el, vars ) ->
    msgArg = {}
    [
      msgArg.msg                          # Msg passed from user
      msgArg.display                      # .help-inline
      msgArg.cls                          # .nod_msg
      @pos_classes                        # ['add-on','help-inline']
      @broadcastError                    # if true, this will broadcast errors
    ] = vars
    @$msg = @createMsg msgArg             # create the element
    @showMsg = @createShowMsg()           # Create fn to show @$msg
    @events()


  events : =>
    @$el.on 'toggle', @toggle             # The only outside trigger


  createMsg : ( arg ) ->                  # Returns the el we toggle
    $ '<span/>',
      'html'  : arg.msg
      'class' : arg.display + ' ' + arg.cls



  toggle : =>
    if @$el.status
      @$msg.remove()
    else
      @showMsg()
      @broadcast() if @broadcastError


  createShowMsg : =>                      # Returns a fn that shows @$msg
    if @$el.attr( 'type' ) is 'checkbox'
      -> @$el.parent().append @$msg       # If checkbox, append to parent
    else
      pos = @findPos @$el                 # Returns el before our @$msg
      -> pos.after @$msg


  findPos : ( $el ) ->                    # Recursive fn <3
    if @nextElHasClass $el                # If next el has one of pos class
      return @findPos $el.next()          # then we run it again.
    $el                                   # Else, we just return the el


  nextElHasClass : ( $el ) ->
    for s in @pos_classes
      if $el.next( s ).length             # If the next el has one of the
        return true                       # classes in @pos_classes, we
    false                                 # return true and do it again


  broadcast : ->
    data =
      'el'  : @$el
      'msg' : @$msg.html()
    $(window).trigger 'nod_error_fired', data
