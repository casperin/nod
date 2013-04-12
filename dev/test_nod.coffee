$ = 'boo'
jQuery ->

  fn = (v) ->
    if v == "" then return false
    v % 2 == 0

  g = (v) -> jQuery.get 'dev/resp.txt', v

  regex = /foo/
  
  metrics = [
    [ '#one', 'email', 'regexp' ]
    # [ '#one', 'email', 'email' ]
    [ '#two', g, 'get' ]
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
