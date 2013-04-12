$ = 'boo'
jQuery ->

  fn = (v) ->
    if v == "" then return false
    v % 2 == 0

  g = (v) -> jQuery.get 'dev/resp.txt', v

  regex = /foo/
  
  metrics = [
    [ '[name=a]', 'presence', 'pres err' ]
    # [ '#bar', 'exact:a1', 'exact err' ]
    # [ '#one', 'presence', 'pre' ]
    # [ '#one', 'email', 'email' ]
    [ '#two', 'presence', 'em' ]
  ]

  options = {
    # 'groupSelector' : 'li'
    # 'disableSubmitBtn' : false
    # 'broadcastError' : true
    # 'delay' : 0
    # 'submitBtnSelector' : '#submit_btn'
  }


  jQuery("#form").nod metrics, options
  #$("form").nod()
