var popoverSettings
$(document).ready(function(dateOptions) {
  // Load modals on errors
  var error = GetURLParameter("error");
  if (error == "login") {
    new bootstrap.Modal($("#loginModal")).show()
  } else if (error == "registration") {
    new bootstrap.Modal($("#registrationModal")).show()
  }

  // Set popover content and settings
  popoverContent = $(".popover-html").html();
  popoverSettings = {
    content: popoverContent,
    html: true,
    sanitize: false,
  }
  // Make all sortables work
  make_sortables();
  // Make first tasklist tab show
  if ($("#tasklists_list a:first").length != 0) {
    var firstTab = new bootstrap.Tab($("#tasklists_list a:first"));
    firstTab.show();
  }


  task_functions();
  tasklist_functions();

});


function GetURLParameter(sParam) {
  var sPageURL = window.location.search.substring(1);
  var sURLVariables = sPageURL.split('&');
  for (var i = 0; i < sURLVariables.length; i++) {
    var sParameterName = sURLVariables[i].split('=');
    if (sParameterName[0] == sParam) {
      return sParameterName[1];
    }
  }
}

function make_sortables() {
  let tasklistElems = $(".tasklist-ul");
  let tasklistListElems = $("#tasklists_list");
  // console.log(tasklistElems);
  for (let i = 0; i < tasklistElems.length; i++) {
    Sortable.create(tasklistElems[i], {
      animation: 200,
      draggable: '.list-group-item',
      handle: '.handle',
      sort: true,
      filter: '.sortable-disabled',
      chosenClass: 'active',
      onEnd: function( /**Event*/ evt) {
        save_new_order()
      },
    });
  }
  if (tasklistListElems.length > 0) {
    Sortable.create(tasklistListElems[0], {
      animation: 200,
      draggable: '.list-group-item',
      sort: true,
      handle: '.handle',
      filter: '.sortable-disabled',
      onEnd: function( /**Event*/ evt) {
        save_new_tasklist_order()
      },
    });
  }
}

function save_new_order() {
  var a = [];
  var s
  let visibleTabPane = $("div.tab-pane:visible");
  console.log(visibleTabPane.find(".tasklist-ul"));
  visibleTabPane.find(".myli").each(function(i) {
    console.log($(this));
    a.push($(this).val());
  });
  console.log(visibleTabPane.find("#tasklist_id").val());
  s = a.join(",");
  console.log(s);
  $.post("reorder_tasks", {
      "new_order": s,
      "tasklist_id": visibleTabPane.find("#tasklist_id").val(),
    },
    function(data, status) {
      if (status == "success") {} else {
        alert("Could not save new order")
      }
    });
}

function save_new_tasklist_order() {
  var a = [];
  var s
  $("#tasklists_list").find("a").each(function(i) {
    console.log($(this));
    a.push($(this).attr("tasklist_uid"));
  });
  s = a.join(",");
  console.log(s);
  $.post("reorder_tasklists", {
      "new_order": s,
    },
    function(data, status) {
      if (status == "success") {} else {
        alert("Could not save new order")
      }
    });
}

$.fn.nameinlineEdit = function() {
  $(this).click(function() {
    var elem = $(this);
    visibleTabPane = $("div.tab-pane:visible");
    tasklistId = visibleTabPane.find("#tasklist_id").val();
    elem.hide();
    var replaceWith = $('<input name="name" type="text" id="name-edit" class="form-control form-control-lg" />')
    elem.after(replaceWith);
    leftElem = $("a[href*='#t" + tasklistId + "']").find("span:first");
    console.log(leftElem);
    replaceWith.focus();
    replaceWith.val($(this).text())
    replaceWith.keydown(function(event) {
      if (event.keyCode == 13) {
        replaceWith.blur();
      }
    });
    replaceWith.blur(function() {
      newValue = $(this).val()
      if (newValue != "") {
        $.post("update_tasklist_name", {
            "tasklist_id": tasklistId,
            "new_name": newValue,
          },
          function(data, status) {
            if (status == "success") {
              elem.text(newValue);
              console.log(leftElem.text());
              leftElem.html(newValue);
            } else {
              alert("Could not save new name")
            }
          });
      }

      $(this).remove();
      elem.show();
    });
  });
};

function updateCurrentTaskCount(completed) {
  let visibleTabPane = $("div.tab-pane:visible");
  tasklistId = visibleTabPane.find("#tasklist_id").val();
  leftElem = $("a[href*='#t" + tasklistId + "']").find("span:first");
  pendingTasksCountElem = $("a[href*='#t" + tasklistId + "']").find("span.badge")
  currentPendingTasksCount = parseInt(pendingTasksCountElem.text(), 10);
  if (completed) {
    pendingTasksCountElem.text(currentPendingTasksCount - 1);
  } else {
    pendingTasksCountElem.text(currentPendingTasksCount + 1);
  }
}

function task_functions() {
  //    Adding Task When pressed Enter
  $("input[name='new_task_data']").keydown(function(event) {
    if (event.keyCode == 13) {
      let inputElem = $(this);
      let tasklistDivElem = $(this).parents("div.tab-pane");
      let tasklist_id = tasklistDivElem.attr("tasklist_id")
      let highestPriorityElem = tasklistDivElem.find("input[name='highest_priority']")
      event.preventDefault();
      $.post("add_task", {
          "data": inputElem.val(),
          "highest_priority": highestPriorityElem.val(),
          "tasklist_id": tasklist_id
        },
        function(data, status) {
          if (status == "success") {
            //Add li
            inputElem.val("");
            tasklistDivElem.find("ul").prepend(data);
            highestPriorityElem.val(parseInt(highestPriorityElem.val()) + 1);
            //Add popover to first li
            popoverElem = tasklistDivElem.find('[data-bs-toggle="popover"]:first')
            popoverElem.popover(popoverSettings);
            // Add 1 to tasklist badge
            updateCurrentTaskCount(false);
          } else {
            alert("Error Occured while interacting with server")
          }
        });
    }
  });
  // Action on changing or clearing dates
  $('body').on("changeDate clearDate", ".datepicker", function(e) {
    newDate = $(this).datepicker('getFormattedDate')
    elem = ($(this))
    task_id = $(this).parents("li").val();
    if (newDate) {
      elem.html('<span class="date-display badge rounded-pill bg-secondary"><span class="date">' + newDate + '   </span></span>');
    } else {
      elem.html('<i class="fas fa-calendar-day icon hide-icons"></i>')
    }
    $.post("edit_date", {
        "task_id": task_id,
        "date": newDate
      },
      function(data, status) {
        if (status != "success") {
            alert("Could not fix a date")
        }
      });

  });

  //Toggle icons when hovering over task
  $(".tab-content").on("mouseover", ".myli", function(event) {
    // event.preventDefault();
    $(this).find('.icon').removeClass("hide-icons");
  });
  $(".tab-content").on("mouseleave", ".myli", function(event) {
    $(this).find('.icon').addClass("hide-icons");
    $(this).find('[data-bs-toggle="popover"]').popover("hide")
  });

  // Initilize inline editor
  $(".tab-content").on("click", ".editable", function(event) {
    var elem = $(this);
    taskId = $(this).parents("li").val();
    elem.hide();
    var replaceWith = $('<input name="temp" type="text" id="task-edit" class="form-control form-control-lg" />')
    elem.after(replaceWith);
    replaceWith.focus();
    replaceWith.val($(this).text())
    replaceWith.keydown(function(event) {
      if (event.keyCode == 13) {
        replaceWith.blur();
      }
    });
    replaceWith.blur(function() {
      newValue = $(this).val()
      if (newValue != "") {
        $.post("update_task", {
            "task_id": taskId,
            "text": newValue,
          },
          function(data, status) {
            if (status == "success") {
              elem.text(newValue);
            } else {
              alert("Could not save new order")
            }
          });
      }

      $(this).remove();
      elem.show();
    });
  });

  //Initialize in line edit for tasklist name
  $('.name-editable').nameinlineEdit();

  // Initilize tooltips with selector for dynamic
  $('body').tooltip({
    selector: '[data-bs-toggle="tooltip"]'
  });

  // Initilize popover for colors
  $popoverContent = $(".popover-html").html();
  $('[data-bs-toggle="popover"]').popover(popoverSettings);

  // Set colors of Checkbox
  $(".tab-content").on("click", ".fa-circle", function(event) {
    task_id = $(this).parents("li").val();
    $(this).parent().parent().siblings('.checkbox').css({
      "color": $(this).css("color")
    })
    $.post("color_task", {
        "task_id": task_id,
        "color": $(this).css("color")
      },
      function(data, status) {
        if (status != "success") {
          alert("Could not color the sky")
        }
      });
  });

  // Marking Star
  $(".tab-content").on("click", ".fa-star", function(event) {
    task_id = $(this).parents("li").val();
    me = $(this);
    me.toggleClass("starred")
    $.post("star_task", {
        "task_id": task_id,
        "star": $(this).hasClass("starred")
      },
      function(data, status) {
        if (status != "success") {
          alert("Could not star the sky")
        }
      });
  });

  //Deleting task
  $(".tab-content").on("click", ".fa-trash-alt", function(event) {
    liToRemove = $(this).parents("li")
    task_id = $(this).parents("li").val();
    liToRemove.find('[data-bs-toggle="tooltip"]').tooltip('dispose');
    liToRemove.remove();
    $.post("delete_task", {
        "task_id": task_id
      },
      function(data, status) {
        if (status == "success") {
          updateCurrentTaskCount(true);
        } else {
          alert("Could not Delete");
        }
      });
  });

  // Marking Complete
  $(".tab-content").on("click", ".checkbox", function(event) {
    liElem = $(this).parents("li");
    task_id = liElem.val();
    liElem.toggleClass("completed");
    updateCurrentTaskCount(liElem.hasClass("completed"));
    $.post("mark_complete_task", {
        "task_id": task_id,
        "complete": liElem.hasClass("completed")
      },
      function(data, status) {
        if (status != "success") {
              alert("Could not finish my work")
        }
      });
  });





}

function tasklist_functions() {
  // Sharing Modals scripts
  $("body").on('show.bs.modal', "#sharingModal", function(event) {
    // Button that triggered the modal
    var button = event.relatedTarget
    var base_url = window.location.origin;
    var link = base_url + "/" + button.getAttribute('data-bs-link')
    var copyButton = $(this).find('.modal-body button')
    $(this).find('.modal-body input').val(link);
    copyButton.click(function() {
      navigator.clipboard.writeText(link);
      newValue = "Link Copied!"
      copyButton.attr('data-bs-original-title', newValue).tooltip('show');
    });

    // modalBodyInput.value = recipient
  })
  $("body").on('hide.bs.modal', "#sharingModal", function(event) {
    // Button that triggered the modal
    var copyButton = $(this).find('.modal-body button')
    copyButton.attr('data-bs-original-title', "Copy Link").tooltip('show');
  });
  // Deleting Tasklist scripts
  $("body").on('show.bs.modal', "#deleteTasklistModal", function(event) {
    // Button that triggered the modal
    var button = event.relatedTarget
    var base_url = window.location.origin;
    var uid = button.getAttribute('data-bs-uid');
    var name = button.getAttribute('data-bs-name');
    var deleteButton = $(this).find('a#delete-tasklist');
    $(this).find('.modal-body .name').text(name);
    deleteButton.attr("href", "delete_tasklist/" + uid);
  });
}
