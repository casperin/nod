$ = 'boo'
jQuery ->

  fn = (v) ->
    if v == "" then return false
    v % 2 == 0

  regex = /357/
  
  metrics = [
    [ '[name=rad]', 'not:2', 'must be radioed' ]
    [ '#radio2', 'presence', 'prs' ]
    [ '#one', 'email', 'must be present' ]
    [ '#two', 'integer', 'must be present' ]
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
