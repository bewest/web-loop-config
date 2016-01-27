
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
  $.ajax(settings).always(function _done (payload, status, xhr) {
    target.removeClass('busy');
    target.trigger({ type: 'io:complete'}, arguments);
  });
  ev.preventDefault( );
  return false;
}

function render_wifi_list (dom, data) {
  // break my usual rule of no html in js because option elements are pure text
  var clone = $("<option/>");

  dom.find('OPTION').remove( );
  if (data && data.networks) {
    data.networks.forEach(function (network) {
      var template = clone.clone(true);
      template.text(network.ssid);
      template.val(network.ssid);
      dom.append(template);
    });
  }
}

function setup_data_ajax (idx, elem) {
  var target = $(elem);
  var settings = {
    context: target
  , method: 'GET'
  , url: target.data('ajax-target')
  };
  $.ajax(settings).done(function _done ( ) {
    target.trigger({ type: 'io:complete' }, arguments);
  });
}

function handle_signup (ev, payload, status, xhr) {
  console.log('signup payload', payload);
  console.log('signup status', status);
  console.log('signup args', arguments);
  if (status) {
  }
  if (payload && payload.success) {
    $('#wizard').trigger('io:reload');
  }
}

function handle_claim (ev, payload, status, xhr) {
  console.log("CLAIMED", payload, status);
}
$(document).ready(function() {

  var conf = {
    signup: $('#signup-form')
  , initialize: $('#initialize')
  , network: $('#network-choice')
  , wizard: $('#wizard')
  };


  $('BODY').on('submit', 'FORM', ajax_form);

  // $('#signup-form').on('io:complete', console.log.bind(console, "SIGNUP", "EV"));
  // $('#initialize').on('io:complete', console.log.bind(console, "INIT", "EV"));
  $('#signup-form').on('io:complete', handle_signup);
  $('#claim_setup').on('io:complete', handle_claim);

  $('[data-ajax-target]').each(setup_data_ajax);
  $('[data-ajax-target]').on('io:reload', function (ev) {
    $([this]).each(setup_data_ajax);
  });

  $('#network-choice').on('io:complete', function (ev, payload, status, xhr) {
    var target = $(this);
    render_wifi_list(target, payload);
  });

  $('#wizard').on('io:complete', conf, function (ev, payload, status, xhr) {

    ev.data.wizard.find('.phase').removeClass('active');
    console.log("WIZARD STATE", payload);
    var state = 'signup';
    if (payload.wizard.user) {
      state = 'claim';
      if (payload.wizard.home) {
        state = 'activate';
      }
    }
    var selector = '.phase.' + state;
    $(selector).addClass('active');
  });

  $('#openaps_commence').on('io:complete', conf, function (ev, payload, status, xhr) {
    console.log('commenced', status);
    if (status == 'success') {
      window.location.href = '/';
    }
  });

  $('.testing-devices').on('click', '.device-test BUTTON', function (ev) {
    var control = $(this).closest('LI');
    control.addClass('testing');
    var button = $(ev.target);
    button.prop('disabled', true);
    control.find('.result').text('')
    var conf = { url: control.data('test-uri')
      , method: 'GET'
    };
    $.ajax(conf).done(function (body) {
      console.log("TEST", body);
      control.addClass('done').removeClass('testing');
      control.find('.result').text(body)
      button.prop('disabled', false);
    });
  });
});

