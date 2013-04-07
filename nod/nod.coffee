# The main class. Sets up everything.
#
# Also takes care of toggling submit buttons and group classes if errors exist
#
class Nod
  constructor: (@form, fields, options ) ->
    unless fields then return                 # Silent fail

    @get = jQuery.extend
      'delay'             : 700               # Keyup > delay(ms) > input check
      'disableSubmitBtn'  : true              # automatically disable submit btn
      'helpSpanDisplay'   : 'help-inline'     # Help-inline / help-block
      'groupClass'        : 'error'           # Error / info / warning / success
      'submitBtnSelector' : '[type=submit]'   # Selector to find submit btn
      'metricsSplitter'   : ':'               # The ":" in "max-length:4"
      'errorPosClasses'   : [                 # Errors will show up after the
                              '.help-inline'  # input field or after one of
                              '.add-on'       # these selectors
                              'button'
                              '.input-append' # If parent has this class it
                            ]                 # go up one and continue
      'broadcastError'    : false             # True to trigger event on error
      'errorClass'        : 'nod_msg'         # Your error msg gets this class
      'groupSelector'     : '.control-group'  # Should surround the field + msg
      , options


    @listeners = @createListeners fields      # Creating all elements!
    @submit    = @form.find @get.submitBtnSelector # our submit btn
    @checkIfElementsExist @form, @submit, @get.disableSubmitBtn
    @events()


  createListeners : ( fields ) =>
    listeners = []                            # Container for our listeners
    for field in fields                       # field = ['#foo','float','msg']
      if field.length isnt 3 then @throw 'field', field   # help for users
      [ selector, metric, msg ] = field
      for el in @form.find selector
        listeners.push new Listener el, @get, metric, msg
    listeners


  events : =>
                                              # Listen for toggles on every el
    jQuery( l ).on( 'nod_toggle', @toggle_status ) for l in @listeners

    if @submit.length
      @submit.on 'click', @massCheck          # [enter] will trigger this too
    else
      @form.on 'submit', @massCheck           # For forms w/o submit btn


  massCheck : ( event ) =>
    l.runCheck() for l in @listeners          # Run check on every field
    event.preventDefault() if @errorsExist()  # Don't submit form if errors


  toggle_status: ( event ) =>                 # Status on single el has changed
    @toggleGroupClass event.target.$el.parents @get.groupSelector
    @toggleSubmitBtn() if @get.disableSubmitBtn


  toggleGroupClass: ( $group ) =>             # Runs on a specific group
    act = if $group.find( '.'+@get.errorClass ).length then 'add' else 'remove'
    $group[act+'Class'] @get.groupClass       # add or remove Class of group


  toggleSubmitBtn : =>                        # Disables submit btn if errors
    d = 'disabled'
    @submit.removeClass( d ).removeAttr( d )
    @submit.addClass( d ).attr( d, d ) if @errorsExist()


  errorsExist : =>                            # Helper to search for errors
    !!jQuery( @listeners ).filter( -> !@status ).length


  checkIfElementsExist : ( form, submit, disableSubmitBtn ) ->     # Helper fn
    if !form.selector or !form.length then @throw 'form'  , form   # check form
    if !submit.length and disableSbmt then @throw 'submit', submit # check sbmt


  throw : ( type, el ) ->                     # Helper to throw errors
    switch type
      when 'form'   then txt = 'Couldn\'t find form: '
      when 'submit' then txt = 'Couldn\'t find submit button: '
      when 'field'  then txt = 'Metrics for each field must have three parts: '
    throw new Error txt + el
