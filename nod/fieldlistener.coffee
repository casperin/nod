class FieldListener
  constructor: ( @el, @metrics, @msg, @nod ) ->
    @errorMsg     = @createErrorMsg @msg, @nod.settings.helpSpanDisplay
    @delayTime    = @nod.settings.delay
    @delayId      = ""
    @fieldCorrect = if @metrics[0] == 'presence' then null else true
    @errorMsgPos  = @findErrorMsgPos(@el) # returns an element
    @type         = @el.attr( 'type' ) or @el.prop( 'tagName' ).toLowerCase()
    @events()


  # create the error msg (creating doesn't show it anywhere)
  #
  # 'help-inline' is too generic, so we create our own to look for later
  #
  createErrorMsg: ( msg , displayType ) ->
    $ '<span/>',
      'html' : msg
      'class' : @nod.settings.errorClass + ' ' + displayType
    

  # events each field listen for 
  events: =>
    @el.on 'keyup', @delayedCheck    # we delay the input check on keypresses
    @el.on 'blur',  @runCheck        # on blur we run the check intantly
    @el.on 'change', @runCheck       # for checkboxes and select fields


  delayedCheck: =>
    clearTimeout @delayId            # cancel the previous delayed check
    @delayId = setTimeout @runCheck, @delayTime    # create new setTimeout
     

  runCheck: =>                       # query the mother ship if value is okay
    value = if @type is 'checkbox' then @el.is(':checked') else @el.val()
    @toggleError @nod.isCorrect @metrics, value


  # Determines whether to toggle the error msg
  #
  # and calls mother to toggle group class (.error)
  #
  toggleError: ( isCorrect ) =>
    # @fieldCorrect saves last state of field. If state changed, then continue
    if isCorrect isnt @fieldCorrect

      if isCorrect                          # remove error msg
        @errorMsg.remove()
      else                                  # show error msg
        if @type is 'checkbox'
          @el.parent().append @errorMsg
        else
          @errorMsgPos.after @errorMsg

      @fieldCorrect = isCorrect             # toggle saved state
      @nod.toggleFormControls()             # toggle group class (maybe)


  # find the element after which the errorMsg should be added
  findErrorMsgPos : (el) ->
    if @nextElHasClass el, @nod.settings.errorPosClasses
      return @findErrorMsgPos el.next()     # call itself with the next element
    el


  # check if next element returns on any of the selectors in [selectors]
  nextElHasClass : ( el, selectors ) ->
    for s in selectors
      return true if el.next(s).length
      false

