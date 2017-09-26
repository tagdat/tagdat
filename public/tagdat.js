var tagdat_api_url = "https://tagdat-tagdat.1d35.starter-us-east-1.openshiftapps.com/tagdat?";
var tagdat_option_list = ['item','parent','domain','limit'];
var tagdat_locks = true;

function tagdat_options(id) {
  var form = $('#' + id);
  var options = {};
  for (var i = 0; i < tagdat_option_list.length; i++) {
    options[tagdat_option_list[i]] = $('input[name=' + tagdat_option_list[i] + ']',form).val();
  }
  return options; 
}

function tagdat_sync_down(id) {
  var options = tagdat_options(id);
  $.getJSON(tagdat_api_url + "jsonp=?",options, function(data) {
    var tags = '';
    var tagdat_display_tags = $('#' + id + ' .tagdat_display_tags');
    tagdat_display_tags.html('');
    for (var i = 0; i < data.length; i++) {
      var tag = encodeURIComponent(data[i]);
      var link = document.createElement('a');
      link.onclick = function() {
        var tagp = tag;
        var idp = id;
        return function() {
          return tagdat_query(tagp,idp);
        };
      }();
      link.href = '#';
      link.appendChild(document.createTextNode(tag));
      tagdat_display_tags.append(link);
      tags += tag;
      if (i < data.length-1) {
        tagdat_display_tags.append(document.createTextNode(', '));
        tags += ' ';
      }
    }
    $('#' + id + ' input[name=tags]').val(tags);
    $('#' + id + ' .tagdat_edit_controls').hide();
    $('#' + id + ' .tagdat_display_controls').show();
  });
}

function tagdat_sync_up(id) {
  $('#' + id + ' .tagdat_edit_controls').hide();
  var options = tagdat_options(id);
  options['tags'] = $('input[name=tags]',$('#' + id)).val();
  $.getJSON(tagdat_api_url + "jsonp=?",options, function(data) {
    tagdat_sync_down(id);
  });
  return false;
}

function tagdat_populate_form(options,id) {
  var form = $('#' + id);
  for (var i = 0; i < tagdat_option_list.length; i++) {
    var val = ''
    if (options[tagdat_option_list[i]] != undefined) {
      val = options[tagdat_option_list[i]];
    }
    $('input[name=' + tagdat_option_list[i] + ']',form).val(val);
  }
  tagdat_sync_down(id);
}

function tagdat_submit(submit_button) {
  var id = $(submit_button).closest('form')[0].id;
  tagdat_sync_up(id);
  return false;
}

function tagdat_cancel(cancel_button) {
  var id = $(cancel_button).closest('form')[0].id;
  $('#' + id + ' input[name=tags]').replaceWith(
    $('<input>').attr({
      type: 'hidden',
      name: 'tags',
      class: 'tagdat_tags_line',
    })
  );
  $('#' + id + ' .tagdat_edit_controls').hide();
  tagdat_sync_down(id);
  return false;
}

function tagdat_edit(edit_button) {
  var id = $(edit_button).closest('form')[0].id;
  $('#' + id + ' .tagdat_display_controls').hide();
  $('#' + id + ' .tagdat_edit_controls').show();
  var tags = $('#' + id + ' input[name=tags]').val();
  $('#' + id + ' input[name=tags]').replaceWith(
    $('<input>').attr({
      type: 'text',
      name: 'tags',
      class: 'tagdat_tags_line',
    }).val(tags)
  );
  return false;
}

function tagdat_query(tag,id) {
  if (tagdat_query['busy'] == true && tagdat_locks) {
    return false;
  }
  tagdat_query['busy'] = true;
  var options = tagdat_options(id);
  options['query'] = tag;
  $('#' + id + ' .tagdat_results').html('<div class="tagdat_waiting"></div>');
  $.getJSON(tagdat_api_url + "jsonp=?",options, function(data) {
    var queried = $('#' + id + ' .tagdat_query');
    queried.html('');
    queried.append(document.createTextNode(options['query']));
    var tagdat_results = $('#' + id + ' .tagdat_results');
    tagdat_results.html('');
    for (var i = 0; i < data.length; i++) {
      var link = document.createElement('a');
      link.href = data[i];
      link.onclick = function() {
        $('.tagdat_query_box').hide();
        tagdat_query['busy'] = false;
        return true;
      };
      var name = data[i].match(/.*#(.*)/);
      if (name) {
        link.appendChild(document.createTextNode(name[1]));
      } else {
        link.appendChild(document.createTextNode(data[i]));
      }
      tagdat_results.append(link);
    }
    $('#' + id + ' .tagdat_query_box').show();
  });
  return false;
}

function tagdat_close(close_button) {
  var id = $(close_button).closest('form')[0].id;
  $('#' + id + ' .tagdat_query_box').hide();
  $('#' + id + ' .tagdat_results').html('');
  tagdat_query['busy'] = false;
  return false;
}

function tagdat(options) {
  if (options['locks'] != undefined) {
    tagdat_locks = options['locks'];
  }

  var id = Math.floor(Math.random() * 0x100000000).toString(16);

  document.write('<div class="tagdat_widget"><form onsubmit="return tagdat_sync_up(\''+ id +'\');" id="' + id + '">');
  document.write('  <div class="tagdat_display_controls" style="display: none;">');
  document.write('    <div class="tagdat_taglabel"></div>');
  for (var i = 0; i < tagdat_option_list.length; i++) {
    document.write('  <input type="hidden" name="' + tagdat_option_list[i] + '"></input>');
  }
  document.write('    <div class="tagdat_display_tags"></div>');
  document.write('    <a class="tagdat_edit_button" onclick="return tagdat_edit(this);" href="#"></a>');
  document.write('  </div>');
  document.write('  <div class="tagdat_edit_controls" style="display: none;">');
  document.write('    <input class="tagdat_tags_line" type="hidden" name="tags"></input>');
  document.write('    <div class="tagdat_edit_buttons">');
  document.write('      <a class="tagdat_cancel_button" onclick="return tagdat_cancel(this);" href="#"></a>');
  document.write('      <a class="tagdat_submit_button" onclick="return tagdat_submit(this);" href="#"></a>');
  document.write('      &nbsp;');
  document.write('    </div>');
  document.write('  </div>');
  document.write('  <div class="tagdat_query_box" style="display: none;">');
  document.write('    <a class="tagdat_close_button" onclick="return tagdat_close(this);" href="#"></a>');
  document.write('    <div class="tagdat_query_label"></div><div class="tagdat_query"></div>');
  document.write('    <div class="tagdat_results"></div>');
  document.write('  </div>');
  document.write('</form></div>');

  tagdat_populate_form(options,id);
}
