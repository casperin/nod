# The mother ship. This creates listeners and messages, as well as creates the
# functions for checking fields, etc.
#
# It also takes care of disabling the submit button on errors and checking that
# we have the elements we need.
#
# This class also contains any variable that can be meaningfully changed.
#
class Nod
  constructor: (@form, @fields, options ) ->

    # classes and attributes used in this library
    #
    # everything can be changed using the options object. I put the most likely
    # to be changed at the top.
    #
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


    @err = [                                  # error msgs to throw at people
      "Arguments for each field must have three parts: "
      "Couldn't find any form: "
      "Couldn't find any Submit button: "
      "The selector in 'same-as' isn't working"
      "I don't know "
    ]

    unless @fields then return                # Silent fail
    @els    = @createEls()                    # Creating all elements!
    @submit = @form.find @get.submitBtnSelector   # our submit btn
    @checkIfElementsExist @form, @submit, @disableSubmitBtn

    @events()


  checkIfElementsExist : ( form, submit, disableSubmitBtn ) ->
    if !form.selector || !form.length     then throw @err[1] + form
    if !submit.length && disableSubmitBtn then throw @err[2] + submit


  events : =>
    @form .on( 'submit', @massCheck  )
    $el   .on( 'nod_toggle', @toggle ) for $el in @els


  massCheck : ( ev ) =>
    for $el in @els
      $el.trigger( 'change' )
      ev.preventDefault() if !$el.status


  toggle: ( ev ) =>
    @toggleGroupClass jQuery ev.currentTarget
    @toggleSubmitBtn() if @get.disableSubmitBtn


  toggleGroupClass: ( $target ) =>
    $group = $target.parents @get.groupSelector
    errCls = $group.find '.' + @get.errorClass

    if errCls.length
      $group.addClass @get.groupClass
    else
      $group.removeClass @get.groupClass


  toggleSubmitBtn : =>
    d = 'disabled'
    @submit.removeClass( d ).removeAttr( d )
    for $el in @els
      if !$el.status
        @submit.addClass( d ).attr( d, d )


  createEls : =>
    els = []                                  # Container for our elements
    for field in @fields                      # field = ['#foo','float','bleh']

      if field.length != 3                    # Run a check if user did their
        throw @err[0] + field                 # job properly

      nodMsgVars = [                          # We parse the vars as a list to
        field[2]                              # each Msg class and listener
        @get.helpSpanDisplay                  # class.
        @get.errorClass                       # field[2] is the msg from user
        @get.errorPosClasses
        @get.broadcastError                   # Bool
      ]

      listenVars = [                          # For the listener
        @makeChecker field[1]                 # A fn that performs check of val
        @get.delay                            # int [700]
      ]

      for el in jQuery field[0]               # The selector could hit more
        $el = jQuery el                       # than one element
        els.push $el                          # We want to save each element
        new NodMsg        $el, nodMsgVars     # The actual error Msg
        new FieldListener $el, listenVars     # The listener and checker
    els                                       # Return the list to @els




  makeChecker : ( m ) ->                      # m = 'max-length:8'

    if !!(m && m.constructor && m.call && m.apply)  # If user passes a fn, then
      return (v) -> m v                             # we just return that.

    if m instanceof RegExp                    # If user passes a regexp, then
      return (v) -> m.test v                  # we use that for testing.

    [ type, arg, sec ] = jQuery.map m.split(@get.metricsSplitter) , jQuery.trim

    if type=='same-as' && jQuery(arg).length!=1    # Special case
      throw new Error @err[3]

    switch type
      when 'presence'     then (v) -> !!v
      when 'exact'        then (v) -> v == arg
      when 'not'          then (v) -> v != arg
      when 'same-as'      then (v) -> v == jQuery(arg).val()
      when 'min-length'   then (v) -> v.length >= arg   # Automatic conversion
      when 'max-length'   then (v) -> v.length <= arg   # of arg to an int in
      when 'exact-length' then (v) -> v.length == arg   # these cases.
      when 'between'      then (v) -> v.length >= arg and v.length <= sec
      when 'integer'      then (v) -> !v or (/^\s*\d+\s*$/).test v
      when 'float'        then (v) -> !v or (/^[-+]?[0-9]+(\.[0-9]+)?$/).test v
      when 'email'        then (v) -> !v or (/^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/).test v # RFC822
      else throw @err[4] + type
