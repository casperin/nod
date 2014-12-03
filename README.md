Nod v.2.0
=========

Frontend input validation

[Documentation and examples](http://casperin.github.com/nod "nod") -- or you can
just clone this and open index.html :)

Practical info
--------------

* **License:** MIT.
* **Dependencies:** None.
* **Browser support:** Chrome (newest) / FF (newest) / ie9+.
  * Please help me test in ie (9 and up). I have very limited access to windows machines.
* **Backwards compatibility:** ver. 2 is *not* compatible with previous versions.


Examples
--------

Cloning the project, and checking out the examples is the best way to go. But here are some basic stuff to give you and idea and get you going.

```html
<form action=''>
    <label>
        <span>Name</span>
        <input type='text' class='name'>
    </label>
    <label>
        <span>Email</span>
        <input type='text' class='email'>
    </label>
    <label>
        <span>Email again</span>
        <input type='text' class='email-again'>
    </label>
    <label>
        <input type='checkbox' class='terms'>
        <span>I agree to terms &amp; conditions</span>
    </label>
    <button class='submit-btn' type='submit'>Sign up</button>
</form>
```

A basic sign up form. Let's add some validation.

```javascript
var n = nod();

// We disable the submit button if there are errors.
n.configure({
    submit: '.submit-btn',
    disableSubmit: true
});

n.add([{
    selector: '.name',
    validate: 'min-length:2',
    errorMessage: 'Your name must be at least two characters long.'
}, {
    selector: '.email',
    validate: 'email',
    errorMessage: 'That doesn\'t look like it\'s a valid email address.'
}, {
    selector: '.email-again',
    validate: 'same-as:.email',
    errorMessage: 'The email does not match.'
}, {
    selector: '.terms',
    validate: 'checked',
    errorMessage: 'You must agree to our terms and canditions.'
}]);
```
