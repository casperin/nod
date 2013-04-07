$ = 'boo'
jQuery ->

  fn = (v) ->
    if v == "" then return false
    v % 2 == 0

  regex = /357/
  
  metrics = [
    [ '#one', 'presence', 'presence' ]
    [ '#one', 'email', 'email' ]
    [ '#two', 'integer', 'int' ]
  ]

  options = {
    # 'groupSelector' : 'li'
    # 'disableSubmitBtn' : false
    # 'broadcastError' : true
    # 'delay' : 0
    'submitBtnSelector' : '#submit_btn'
  }


  jQuery("#form").nod metrics, options
  #$("form").nod()
