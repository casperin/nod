$.fn.nod = ( fields, settings ) ->
  unless fields or settings
    return this[0].__nod
  new Nod( this, fields, settings )
  return this
