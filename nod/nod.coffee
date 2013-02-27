class Nod
  constructor: (@form, @fields, options ) ->

    # classes and attributes used in this library
    #
    # everything can be changed using the options object. I put the most likely
    # to be changed at the top.
    #
    @settings = $.extend
      'delay'             : 700               # Keyup > delay(ms) > input check
      'disableSubmitBtn'  : true              # automatically disable submit btn
      'helpSpanDisplay'   : 'help-inline'     # Help-inline / help-block
      'groupClass'        : 'error'           # Error / info / warning / success
      'submitBtnSelector' : '[type=submit]'   # Selector to find submit btn
      'metricsSplitter'   : ':'               # The ":" in "max-length:4"
      'errorPosClasses'   : [                 # Errors will show up after the
                              '.help-inline'  # input field or after one of
                              '.add-on'       # these classes
                            ]
      'errorClass'        : 'nod_msg'         # Your error msg gets this class
      'groupSelector'     : '.control-group'  # Should surround the field + msg
      'disabledAttr'      : 'disabled'        # Attr for submit btn on error
      , options


    @txt =                  # error msgs to throw at people
      'isntThree'         : "Arguments for each field must have three parts: "
      'missingForm'       : "Couldn't find any form: "
      'missingSubmit'     : "Couldn't find any Submit button: "
      'missingSelector'   : "I need a proper selector as an argument for use
                              with 'same-as'"
      'missingSecondArg'  : "I need a second argument when you use 'between'"
      'nan'               : "I need a number to check against when you use that
                              selector"

    @fieldListeners = []
    @createFieldListeners @fields, @fieldListeners

    @submit = @form.find @settings.submitBtnSelector
    @checkIfElementsExist @form, @submit, @disableSubmitBtn

    @events()


  createFieldListeners : ( fields, fieldListeners ) =>
    for field in fields

      # check if arguments provided by user meets the requirements
      if field.length isnt 3
        throw @txt.isntThree + field

      nod     = @           # saving the 'this' to parse along to each fieldListener
      els     = field[0]    # selector of field
                            # metrics for validating
      metrics = $.map( field[1].split(@settings.metricsSplitter) , $.trim )
      msg     = field[2]    # error msg

      $(els).each ->        # build FieldListeners and add them to the list
        fieldListeners.push new FieldListener( $(this), metrics, msg, nod )


  # check if a form and a submit btn was actually found
  checkIfElementsExist : ( form, submit, disableSubmitBtn ) ->
    # if no form were specified, throw an error
    unless form.selector and form.length
      throw @txt.missingForm + form.selector
    # check if they are both there and actual elements on the page
    unless submit.length or !disableSubmitBtn
      throw @txt.missingSubmit + submit


  events : =>             # events on fields are set in the FieldListener
    @submit.on 'click', @runMassCheck


  runMassCheck : ( event ) =>
    for listener in @fieldListeners
      listener.runCheck()       # Run check on each FieldListener
    if @findErrorMsgs().length  # If we find errors, we cancel the submit
      event.preventDefault()
    

  # called by a fieldListener
  toggleFormControls: =>
    @toggleGroupClass()
    if @submit and @settings.disableSubmitBtn
      console.log @settings.disableSubmitBtn
      @toggleSubmitBtn()
      

  toggleGroupClass: =>
    
    # remove .error from all groups
    $(@settings.groupSelector).removeClass @settings.groupClass

    # look for error messages (created by the fieldListeners)
    errorMsgs = @findErrorMsgs()
    if errorMsgs.length

      # find group of each error message, and add .error to it
      #
      # fails silently if the field doesn't have a group
      for errorMsg in errorMsgs
        $(errorMsg)
          .parents( @settings.groupSelector )
          .addClass( @settings.groupClass )


  # returns a list with all the error messages
  findErrorMsgs : =>
    @form.find "."+@settings.errorClass


  toggleSubmitBtn : =>

    # check all fieldlisteners if they return true. If not, set 
    # enableBtn to false
    #
    state = 'enabled'
    d = @settings.disabledAttr
    for listener in @fieldListeners
      state = d if listener.fieldCorrect isnt true
    @btn[state]( @submit, d )
    


  # change attribute and class of a button
  btn : 
    enabled : ( btn, d ) =>
      btn.removeClass( d ).removeAttr d
    disabled : ( btn, d ) =>
      btn.addClass( d ).attr d, d




  # called by a fieldListener
  #
  # returns false if an error was found. Otherwise true
  #
  # metrics = ['case' [, argument, argument]]
  # eg. metrics = ['max-length', '4']
  #     metrics = ['between', '2', '7']
  #
  # value is the value of the field
  #
  isCorrect : ( metrics, value ) ->

    # useful functions and values
    int = ( int ) ->
      int = parseInt int, 10
      if isNaN int
        throw @txt.nan
      int
    len = value.length
    tst = metrics[1] or ""        # the '8' in 'max-length:8'

    switch metrics[0]
      when 'presence'
        return true if value
      when 'max-length'
        return true if len <= int tst
      when 'min-length'
        return true if len >= int tst
      when 'exact'
        return true if value == tst
      when 'not'
        return true if value != tst
      when 'exact-length'
        return true if len == int tst
      when 'between'
        unless metrics[2] and metrics[2].length
          throw @txt.missingSecondArg
        return true if len >= int( tst ) and len <= int( metrics[2] )
      when 'integer'
        return true if !value or (/^\s*\d+\s*$/).test(value)
      when 'float'
        return true if !value or (/^[-+]?[0-9]+(\.[0-9]+)?$/).test(value)
      when 'same-as'
        _el = $ tst
        unless _el.length is 1
          throw @txt.missingSelector
        return true if value is _el.val()
      when 'email'
        return true if !value or (/^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/).test(value) # RFC822
    return false
