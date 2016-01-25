
function ajax_form (ev) {
  
  var target = $(ev.target);
  var settings = {
    context: target
  , data: target.serialize( )
  , method: target.attr('method')
  , url: target.attr('action')
  };
  target.addClass('busy');
  target.trigger('io:busy', [settings]);
  $.ajax(settings).done(function _done (payload, status, xhr) {
    target.removeClass('busy');
    target.trigger({ type: 'io:complete'}, arguments);
  });
  ev.preventDefault( );
  return false;
}

$(document).ready(function() {

  $('BODY').on('submit', 'FORM', ajax_form);

  $('#signup-form').on('io:complete', console.log.bind(console, "SIGNUP", "EV"));

});

