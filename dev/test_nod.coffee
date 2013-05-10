$ = 'boo'
jQuery ->

  fn = (v) ->
    if v == "" then return false
    v % 2 == 0

  g = (v) -> jQuery.get 'dev/resp.txt', v

  regex = /foo/
  
  metrics = [
    # [ '[name=a]', 'presence', 'pres err' ]
    # [ '#bar', 'not:a1', 'You must click on *this* radio button' ]
    # [ '#one', 'presence', 'pre' ]
    # [ '#one', 'email', 'email' ]
    [ '#two', 'presence', 'em' ]
    # [ '#one, #two, #three', 'one-of', 'yo' ]
    [ '#one', g, 'get' ]
  ]

  ff = ( event, data ) ->
    console.log data

  jQuery("#form").on 'silentSubmit', ff

  options = {
    # 'groupSelector' : 'li'
    # 'disableSubmitBtn' : false
    # 'broadcastError' : true
    # 'delay' : 0
    # 'submitBtnSelector' : '#submit_btn'
    silentSubmit : true
  }


  jQuery("#form").nod metrics, options
  #$("form").nod()
