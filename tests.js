
(function() {

  QUnit.config.reorder = false;
  QUnit.config.noglobals = true;

  var authToken = $('meta[name=csrf-token]').attr('content');
  var addAuthTokenFilter = function(original) {
    original.authenticity_token = authToken;
    return original;
  };

  $.room().createDataFilter = addAuthTokenFilter;
  $.room().updateDataFilter = addAuthTokenFilter;
  $.room().destroyDataFilter = addAuthTokenFilter;

  var fail = function(msg) { ok(false, msg) };

  var failure = function() {
    fail("shouldn't get here");
    start();
  };

  var success = function() {
    ok(true, "successfully ran");
    start();
  }

  var asyncTry = function(unsafe) {
    try {
      unsafe();
    } catch (e) {
      fail("raised unexpected exception: " + e);
      start();
    }
  };

  var logOut = function() {
    $.read('/users/sign_out', success, failure);
  };

  var ensureLoggedIn = function(username, password) {
    var updateAuthToken = function() {
      $.room().ajax({
        url: '/authenticity_token.json',
        error: function(xhr) {
          authToken = xhr.responseText;
          ok(true, "auth token: " + xhr.responseText);
          success();
        },
        success: failure
      });
    };
    var params = {};
    params.email = username;
    params.password = password;
    params.remember_me = 1;
    $.room().user('sign_out').read(
      function() {
        ok(true, 'successfully logged out');
        $.room().user('sign_in').create(params,
          function() {
            ok(true, 'successfully logged in: ' + username);
            updateAuthToken();
          },
          function() {
            params.password_confirmation = password;
            $.room().user().create(params,
              function() {
                ok(true, 'successfully created new user: ' + username);
                updateAuthToken();
              },
              failure);
          });
      },
      failure);
  }

  var testModel = function(name, model,
                                   createModel,
                                   updateModel) {
    module("Testing Model " + name);

    asyncTest("login in testdude", function() {
      ensureLoggedIn('testdude@test.com', 'password');
    });

    var modelData = createModel();
    var createdModel = null;
    asyncTest("creating an instance", function() {
      model().create(modelData,
        function(newlyCreated) {
          asyncTry(function() {
            for(var i in modelData) {
              equals(newlyCreated[i], modelData[i], "the data matches");
            }
            ok(true, "successfully created an instance");
            createdModel = newlyCreated;
            success();
          });
        },
        failure);
    });

    asyncTest("we can list the model", function() {
      model().list(
        function(data) {
          asyncTry(function() {
            ok(data, "returned data is not null");
            success();
          });
        },
        failure
      );
    });

    var leftOvers = [];
    asyncTest("finding leftovers", function() {
      model().list(
        function(data) {
          asyncTry(function() {
            ok(data, "we found some data");
            for(var i in data) {
              leftOvers.push(data[i]);
            };
            success();
          });
        },
        failure);
    });

    asyncTest("destroying leftovers", function() {
      var current;
      if(leftOvers.length == 0) success();
      while(leftOvers.length > 0) {
        current = leftOvers[0];
        leftOvers = leftOvers.splice(1, leftOvers.length - 1);
        stop();
        model(current.id).destroy(success, failure);
      }
      success();
    });

    var modelData = createModel();
    var createdModel = null;
    asyncTest("creating an instance", function() {
      model().create(modelData,
        function(newlyCreated) {
          asyncTry(function() {
            for(var i in modelData) {
              equals(newlyCreated[i], modelData[i], "the data matches");
            }
            ok(true, "successfully created an instance");
            createdModel = newlyCreated;
            success();
          });
        },
        failure);
    });

    asyncTest("retrieving the created instance", function() {
      model(createdModel.id).read(
        function(found) {
          asyncTry(function() {
            for(var i in createdModel) {
              equal(found[i], createdModel[i], "checking found to created");
            }
            success();
          });
        },
        failure
      );
    });

    asyncTest("updating the created instance", function() {
      var newData = updateModel(createdModel);
      model(createdModel.id).update(newData,
        function(updated) {
          asyncTry(function() {
            for(var i in newData) {
              equal(newData[i], createdModel[i], "checking new data to the updated model");
            }
            success();
          });
        },
        failure
      );
    });

    asyncTest("login in testdudetwo", function() {
      ensureLoggedIn('testdudetwo@test.com', 'password');
    });

    asyncTest("can read another user's model", function() {
      model(createdModel.id).read(success, failure);
    });

    asyncTest("cannot destroy another user's model", function() {
      model(createdModel.id).destroy(failure, success);
    });

    asyncTest("cannot update another user's model", function() {
      model(createdModel.id).update(updateModel(createdModel),
                                              failure, success);
    });
  }


  var createExercise = function() {
    return { name: "A new Exercise!" };
  };
  var updateExercise = function(original) {
    original.name = "A different name for the same Exercise";
    return original;
  };
  testModel("Exercise", $.room().exercise, createExercise, updateExercise);

  var createRoutine = function() {
    return { name: "A new Routine!" };
  };
  var updateRoutine = function(original) {
    original.name = "A different name for the same Routine";
    return original;
  };
  testModel("Routine", $.room().routine, createRoutine, updateRoutine);

  var createWorkout = function() {
    return { current_exercise_id: 3 };
  };
  var updateWorkout = function(original) {
    original.current_exercise_id = 7;
    return original;
  };
  testModel("Workout", $.room().workout, createWorkout, updateWorkout);

  asyncTest("login in testdude", function() {
    ensureLoggedIn('testdude@test.com', 'password');
  });

  asyncTest('nested exercise on routine', function() {
    $.room().routine().create(createRoutine(),
      function(newRoutine) {
        $.room().routine(newRoutine.id).exercise().create(createExercise(),
          function(newExercise) {
            $.room().routine(newRoutine.id).exercise().list(
              function(foundExercises) {
                equal(foundExercises.length, 1, 'found the one nested exercise');
                success();
              },
              failure);
          },
          failure);
      },
      failure);
  });

})();
