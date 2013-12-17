# The main class. Sets up everything.
#
# Also takes care of toggling submit buttons and group classes if errors exist
#
class Nod
  constructor: ( @form, fields, options ) ->

    # Silent fail if no fields where passed in.
    unless fields then return

    @form[0].__nod = this

    # Defining variables used throughout the plugin.
    @get = $.extend
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
      'silentSubmit'      : false             # Doesn't submit the form
      'broadcastError'    : false             # True to trigger event on error
      'errorClass'        : 'nod_msg'         # Your error msg gets this class
      'groupSelector'     : '.control-group'  # Should surround the field + msg
      , options

    # First we create all the listeners. One listener per rule per selector.
    @listeners = @createListeners fields

    # Find the submit button. It may not always be defined, which is okay as
    # long as @get.disableSubmitBtn isn't set to true. (This might change in
    # future).
    @submit = @form.find @get.submitBtnSelector

    # Check if the form actually exists, and if the submit button does.
    # This is mainly to help the user in case they made an error.
    @checkIfElementsExist @form, @submit, @get.disableSubmitBtn

    # Set up events
    @events()


  # Returns a list of all the listeners.
  createListeners : ( fields ) =>
    listeners = []      # Container for our listeners

    for field in fields     # this is the metrics list

      # Every field must be have exactly three parts, so we check to see if
      # user did their job properly.
      if field.length isnt 3 then @throw 'field', field

      # Selectors might be general in their scope and return more than one
      # element. We want to apply one listener to each of the elements.
      # Notice that one element can easily end up with more than one listener.
      for el in @form.find field[ 0 ]
        listeners.push new Listener el, @get, field

    return listeners


  events : =>

    for l in @listeners     # Listen for toggles on every listener
      $( l ).on 'nod_toggle', @toggle_status

    # If the form has submit buttons (as defined in the options{}), then they
    # will be the ones triggering the mass check (and they, in return, will be
    # triggered by [enter].
    # This way of doing things, allows you to have submit buttons that are not
    # defined in the options{}, and thus will completely skip the validation
    # and submit the form regardless of errors.
    if @submit.length
      @submit.on 'click touch', @massCheck  # [enter] will trigger this too
    else
      @form.on 'keyup', @listenForEnter     # For forms w/o submit btn

  listenForEnter : ( event ) =>             # Listen for enter and submit form
    if event.keyCode is 13                  # 13 = [enter]
      @massCheck()

  # This function is run whenever the form is submitted.
  massCheck : ( event ) =>
    event?.preventDefault()               # Prevent form from being submitted

    # Push all the checks for each listener into an array.
    checks = []
    checks.push l.runCheck() for l in @listeners

    # This toggles the text of the submit button to that of its
    # data-loading-text attribute if it is set (kind of inline with bootstrap)
    # The text is swapped back as soon as checks are done (regardless of
    # errors).
    @toggleSubmitBtnText()

    # We use $.deferred in case user has ajax checks.
    $
      .when( checks... )
      # When all checks has been run we submit the form unless there are errors
      .then( @submitForm )
      .then( @toggleSubmitBtnText )     # Swap text back to its original


  # This is run whenever a listener changes its status.
  # It toggles the group class (if necessary) of that element, and in case the
  # form has errors it disables the submit button.
  toggle_status: ( event ) =>     # Status on single el has changed
    @toggleGroupClass event.target.$el.parents @get.groupSelector
    @toggleSubmitBtn() if @get.disableSubmitBtn


  toggleGroupClass: ( $group ) =>             # Runs on a specific group
    # if we find errors within this group then we add the .error to it (or
    # whatever the user has defined as the error class).
    if $group.find( '.'+@get.errorClass ).length
      $group.addClass @get.groupClass
    else      # Else we remove it (in case it was already there).
      $group.removeClass @get.groupClass


  # Looks for errors in the form, and enables/disables the submit button as
  # needed.
  toggleSubmitBtn : =>
    if @formIsErrorFree()
      @submit.removeClass( 'disabled' ).removeAttr( 'disabled' )
    else
      @submit.addClass( 'disabled' ).attr( 'disabled', 'disabled' )


  # When called it will check for attr: data-loading-text and swap it with its
  # visible button text.
  toggleSubmitBtnText : =>
    tmp = @submit.attr 'data-loading-text'
    if tmp
      @submit.attr 'data-loading-text',  @submit.html()
      @submit.html tmp


  submitForm : =>
    unless @formIsErrorFree() then return
    if @get.silentSubmit
      $form = $ @form
      $form.trigger 'silentSubmit', $form.serialize()
    else
      @form.submit()


  # Helper to check if the form is free of errors. Returns a boolean.
  formIsErrorFree : =>
    !$( @listeners ).filter( ->
      if @status is null
        @runCheck()
      return !@status
    ).length


  # Helper fn used in the constructor to see if both the form and the submit
  # button is there. It will throw errors at the user in case something is
  # wrong with their config.
  checkIfElementsExist : ( form, submit, disableSubmitBtn ) ->
    if !form.selector or !form.length         # No form
      @throw 'form', form
    if !submit.length and disableSubmitBtn    # No submit button
      @throw 'submit', submit


  # Helper fn to throw errors at the user
  throw : ( type, el ) ->
    switch type
      when 'form'   then txt = 'Couldn\'t find form: '
      when 'submit' then txt = 'Couldn\'t find submit button: '
      when 'field'  then txt = 'Metrics for each field must have three parts: '
    throw new Error txt + el

