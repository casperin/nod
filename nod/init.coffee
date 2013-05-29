$.fn.nod = ( fields, settings ) ->
  if fields == undefined && settings == undefined
    return this[0].__nod 
  new Nod( this, fields, settings )
  return this
