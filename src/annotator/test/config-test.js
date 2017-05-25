'use strict';

var proxyquire = require('proxyquire');

var fakeSettings = sinon.stub();
var fakeExtractAnnotationQuery = {};

var config = proxyquire('../config', {
  '../shared/settings': fakeSettings,
  './util/extract-annotation-query': fakeExtractAnnotationQuery,
});
var sandbox = sinon.sandbox.create();

function fakeWindow() {
  return {
    document: {
      querySelector: sinon.stub().returns({href: 'LINK_HREF'}),
    },
    location: {href: 'LOCATION_HREF'},
  };
}

describe('annotator.config', function() {
  beforeEach('stub console.warn()', function() {
    sandbox.stub(console, 'warn');
  });

  beforeEach('reset fakeSettings', function() {
    fakeSettings.reset();
    fakeSettings.returns({});
  });

  beforeEach('reset fakeExtractAnnotationQuery', function() {
    fakeExtractAnnotationQuery.extractAnnotationQuery = sinon.stub();
  });

  afterEach('reset the sandbox', function() {
    sandbox.restore();
  });

  context("when there's an application/annotator+html <link>", function() {
    var link;

    beforeEach('add an application/annotator+html <link>', function() {
      link = document.createElement('link');
      link.type = 'application/annotator+html';
      link.href = 'http://example.com/link';
      document.head.appendChild(link);
    });

    afterEach('tidy up the link', function() {
      document.head.removeChild(link);
    });

    it("returns the <link>'s href as options.app", function() {
      assert.equal(config(window).app, link.href);
    });
  });

  context("when there's no application/annotator+html <link>", function() {
    it('throws a TypeError', function() {
      var window_ = fakeWindow();
      window_.document.querySelector.returns(null);

      assert.throws(function() { config(window_); }, TypeError);
    });
  });

  it('gets the JSON settings from the document', function() {
    var window_ = fakeWindow();

    config(window_);

    assert.calledOnce(fakeSettings);
    assert.calledWithExactly(fakeSettings, window_.document);
  });

  context('when settings() returns a non-empty object', function() {
    it('reads the setting into the returned options', function() {
      // config() just blindly adds any key: value settings that settings()
      // returns into the returns options object.
      fakeSettings.returns({foo: 'bar'});

      var options = config(fakeWindow());

      assert.equal(options.foo, 'bar');
    });
  });

  context('when settings() throws an error', function() {
    beforeEach(function() {
      fakeSettings.throws();
    });

    it('catches the error', function() {
      config(fakeWindow());
    });

    it('logs a warning', function() {
      config(fakeWindow());

      assert.called(console.warn);
    });
  });

  context("when there's a window.hypothesisConfig() function", function() {
    it('reads arbitrary settings from hypothesisConfig() into options', function() {
      var window_ = fakeWindow();
      window_.hypothesisConfig = sinon.stub().returns({foo: 'bar'});

      var options = config(window_);

      assert.equal(options.foo, 'bar');
    });

    specify('hypothesisConfig() settings override js-hypothesis-config ones', function() {
      var window_ = fakeWindow();
      window_.hypothesisConfig = sinon.stub().returns({
        foo: 'fooFromHypothesisConfigFunc'});
      fakeSettings.returns({foo: 'fooFromJSHypothesisConfigObj'});

      var options = config(window_);

      assert.equal(options.foo, 'fooFromHypothesisConfigFunc');
    });

    context('if hypothesisConfig() returns a non-object value', function() {
      it("doesn't add anything into the options", function() {
        var window_ = fakeWindow();
        window_.hypothesisConfig = sinon.stub().returns(42);

        var options = config(window_);

        delete options.app; // We don't care about options.app for this test.
        assert.deepEqual({}, options);
      });
    });
  });

  context("when window.hypothesisConfig() isn't a function", function() {
    it('throws a TypeError', function() {
      var window_ = fakeWindow();
      window_.hypothesisConfig = 'notAFunction';

      assert.throws(
        function() { config(window_); }, TypeError,
        'hypothesisConfig must be a function, see: https://h.readthedocs.io/en/latest/embedding.html'
      );
    });
  });

  describe('showHighlights', function() {
    context("when it's true", function() {
      it('changes it to "always"', function () {
        fakeSettings.returns({showHighlights: true});

        var options = config(fakeWindow());

        assert.equal(options.showHighlights, 'always');
      });
    });

    context("when it's false", function() {
      it('changes it to "never"', function () {
        fakeSettings.returns({showHighlights: false});

        var options = config(fakeWindow());

        assert.equal(options.showHighlights, 'never');
      });
    });

    context("when it's a string", function() {
      it('passes it through unmodified', function () {
        // It adds any arbitrary string value for showHighlights to the
        // returned options, unmodified.
        fakeSettings.returns({showHighlights: 'foobar'});

        var options = config(fakeWindow());

        assert.equal(options.showHighlights, 'foobar');
      });
    });
  });

  it("extracts the annotation query from the parent page's URL", function() {
    config(fakeWindow());

    assert.calledOnce(fakeExtractAnnotationQuery.extractAnnotationQuery);
    assert.calledWithExactly(
      fakeExtractAnnotationQuery.extractAnnotationQuery, 'LOCATION_HREF');
  });

  context('when extractAnnotationQuery() returns an object', function() {
    beforeEach(function() {
      fakeExtractAnnotationQuery.extractAnnotationQuery.returns({
        foo: 'bar',
      });
    });

    it('blindly adds the properties of the object to the options', function() {
      assert.equal(config(fakeWindow()).foo, 'bar');
    });

    specify('settings from extractAnnotationQuery override others', function() {
      // Settings returned by extractAnnotationQuery() override ones from
      // settings() or from window.hypothesisConfig().
      var window_ = fakeWindow();
      fakeExtractAnnotationQuery.extractAnnotationQuery.returns({
        foo: 'fromExtractAnnotationQuery',
      });
      fakeSettings.returns({foo: 'fromSettings'});
      window_.hypothesisConfig = sinon.stub().returns({
        foo: 'fromHypothesisConfig',
      });

      assert.equal(config(window_).foo, 'fromExtractAnnotationQuery');
    });
  });
});
