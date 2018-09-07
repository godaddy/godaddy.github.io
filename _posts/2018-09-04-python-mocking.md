---
layout: post
title: "Making mocking mistakes in Python"
date: 2018-09-04 12:00:00 -0800
cover: /assets/images/python-kitten.jpg
excerpt: Python mocking is tricky. See if you can diagnose and correct four example mocking mistakes, all of which I've made while learning the mock library in the past few months.
authors:
  - name: Raphey Holmes
    url: https://github.com/raphey
    photo: https://avatars.githubusercontent.com/raphey
---


### Background/requirements
This post assumes you have some familiarity with python mocking and the `mock` library. If not, [this intro by Naftuli Kay](https://www.toptal.com/python/an-introduction-to-mocking-in-python) and [this other intro by Amos Omondi](https://semaphoreci.com/community/tutorials/getting-started-with-mocking-in-python) are great places to start; these articles are where I figured out most of the mistakes I've been making. I'm working in Python 2, which still has `mock` v 2.0.0 as its own library rather than part of `unittest`, but the mistakes below also apply for Python 3.

***

### Example mistake 1

For the first example, let's say we're testing a function `is_cat_person`, within the module `main.py`. The function loads some json from a file using `json.load` and decides whether or not the person represented by the json is a Cat Person:

```python
# main.py
import json

def is_cat_person(filepath):
    with open(filepath) as f:
        person_json = json.load(f)
    ...
    # Do some stuff with person_json and return True if Cat Person, False otherwise
```

We want to test the function, but we don't want to create and delete a temporary file representing our test Cat Person, so we'll mock `json`.

```python
# test_example_1.py
import unittest
from mock import patch
from main import is_cat_person

class TestIsCatPerson(unittest.TestCase):

    @patch('json')
    def test_returns_true_for_cat_person(self, mock_json):
        mock_json.load.return_value = {
            'meyers_briggs_type': 'INTJ',
            'likes_laser_pointers': True,
            'dresses_like_a_cat': True
        }
        self.assertTrue(is_cat_person('path/to/person'))

```

Why doesn't this work?

<details><summary>Show error message</summary>
<p>

<code>
Error
Traceback (most recent call last):
  ...
  File "./venv/lib/python2.7/site-packages/mock/mock.py", line 1522, in _get_target
    (target,))
TypeError: Need a valid target to patch. You supplied: 'json'
</code>

</p>
</details>

<details><summary>Show the mistake</summary>
<p>

As the traceback indicates, <code>mock.patch</code> can't find the <code>json</code> module. This can be fixed by changing the patch line to <code>@patch('main.json')</code> This fits with the rule of thumb from the <a href="http://www.voidspace.org.uk/python/mock/patch.html#where-to-patch">documentation</a>  that you should "patch where an object is looked up, which is not necessarily the same place as where it is defined." However, in this case, that isn't the full story: the specific error produced within the mock library is caused by any patch that doesn't involve a <code>.</code> as a separator (the same is true in Python 3's unittest.mock library). If we were to instead use <code>@patch('json.load')</code>, modifying the return value statement to remove the redundant <code>.load</code>, we'd be breaking the rule and mocking it where it came from, but it still works: we're mocking the function from the <code>json</code> package, but <code>main.py</code>'s import points to the whole package. However, if <code>main.py</code> is rewritten to use <code>from json import load</code>, and we tried to patch <code>json.load</code> instead of <code>main.load</code>, our test would fail, since we wouldn't be patching the function we're using.
</p>
</details>

***

### Example mistake 2

Now we've modified our `is_cat_person` function slightly to include a call to a `validate` function, which checks that the json we've loaded has a valid `validation_id` property, throwing an exception if it doesn't:

```python
# main.py
import json

def is_cat_person(filepath):
    with open(filepath) as f:
        person_json = json.load(f)
    if validate(person_json.get('validation_id')):
        ...
        # Do some stuff with person_json and return True if Cat Person, False otherwise
```

Let's say the validation function is time-consuming, so we modify the previous test to mock validation:

```python
# test_example_2.py
import unittest
from mock import patch
from main import is_cat_person

class TestIsCatPerson(unittest.TestCase):

    @patch('main.json')
    @patch('main.validate')
    def test_returns_true_for_cat_person(self, mock_json, mock_validate):
        mock_json.load.return_value = {
            'meyers_briggs_type': 'INTJ',
            'likes_laser_pointers': True,
            'dresses_like_a_cat': True,
            'validation_id': 'h19d8w22' 
        }
        self.assertTrue(is_cat_person('path/to/person'))
```

What's wrong with this?

<details><summary>Show error message.</summary>
<p>

In this case, the test fails, but there is not necessarily any error beyond <code>AssertionError: False is not true</code>.
</p>
</details>

<details><summary>Show the mistake.</summary>
<p>

The problem is the decorator order: as things stand, <code>mock_json</code> is mocking <code>main.validate</code>, and <code>mock_validate</code> is mocking <code>main.json</code>. Decorators move outward/upward from the decorated function, so the arguments need to have that order. When I set this up, there was no error, because the person object returned by <code>mock_validate</code> was taken as truthy, and the <code>True</code> that was returned by <code>mock_json</code> was found to not be a cat person.

Side note: I'm currently reading and enjoying <a href="https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882">Clean Code</a> as part of our engineering book club, and I've been thinking about the way that some of these error-prone mocking situations come about in part because the functions we're testing are too long and/or work at multiple levels of abstraction. Why should one function be responsible for loading json from a file, validating that json, and also performing a classification? But we'll stick with it for now, since it's convenient for these examples.
</p>
</details>

***

### Example mistake 3

Suppose we now want to do a more comprehensive test, in which we check the logic of how the function deals with valid and invalid input, using our own simplified version of validation.

```python
# test_example_3.py
import unittest
from mock import patch
from main import is_cat_person

def simplified_validate(validation_string):
    if validation_string == 'h19d8w22':
        return True
    else:
        raise Exception('Invalid validation id')

class TestIsCatPerson(unittest.TestCase):

    @patch('main.validate')
    @patch('main.json')
    def test_validation_logic_flow(self, mock_json, mock_validate):
        mock_validate = simplified_validate

        mock_json.load.return_value = {
            'meyers_briggs_type': 'INTJ',
            'likes_laser_pointers': True,
            'dresses_like_a_cat': True,
            'validation_id': 'h19d8w22'
        }

        self.assertTrue(is_cat_person('path/to/person'))

        mock_json.load.return_value = {
            'meyers_briggs_type': 'INTJ',
            'likes_laser_pointers': True,
            'dresses_like_a_cat': True,
            'validation_id': 'zzzzzzzz'   # Should trigger a validation exception
        }

        self.assertRaises(Exception, is_cat_person, 'path/to/person')
```

<details><summary>Show error message</summary>
<p>

The first assertion passes, but the second doesn't. There's no meaningful error, other than the fact that an exception isn't raised. A good IDE might call your attention to the <code>mock_validate</code> argument in the two places where it's used.
</p>
</details>

<details><summary>Show mistake</summary>
<p>

It <i>looks</i> like this is setting up <code>simplified_validate</code> to be a stand-in for <code>mock_validate</code>, and by extension a stand-in for <code>main.validate</code>, but the substitution isn't taking place. Instead, we want to use <code>mock_validate.side_effect = simplified_validate</code>, or to simplify things visually, we could change the patch line to <code>@patch('main.validate', side_effect=simplified_validate)</code> and omit the <code>mock_validate</code> argument. I find the <code>side_effect</code> terminology a bit confusing, since the term doesn't do anything to capture the fact that this <code>side_effect</code> will in effect be subbed in for the mocked function and called with the same arguments. If anyone has a good way of explaining this, I'm all ears.
</p>
</details>

***

### Example mistake 4

Let's revisit example 2, but with two differences. First, we've switched to using a `Validator` object, vs a simple `validate` function:

```python
# main.py
import json

def is_cat_person(filepath):
    with open(filepath) as f:
        person_json = json.load(f)
    if Validator().validate(person_json.get('validation_id')):
        ...
        # Do some stuff with person_json and return True if Cat Person, False otherwise
```

Second, this time we'll dodge the patch-ordering issue completely by specifying that our mock Validator will be a general `MagicMock` instance:

```python
# test_example_4.py
import unittest
from mock import MagicMock, patch
from main import is_cat_person

class TestIsCatPerson(unittest.TestCase):

    @patch('main.json')
    @patch('main.Validator', MagicMock())
    def test_returns_true_for_cat_person(self, mock_json):
        mock_json.load.return_value = {
            'meyers_briggs_type': 'INTJ',
            'likes_laser_pointers': True,
            'dresses_like_a_cat': True,
            'validation_id': 'h19d8w22'
        }
        self.assertTrue(is_cat_person('path/to/person'))
```

<details><summary>Show error message</summary>
<p>

No error message, and the test passes.
</p>
</details>

<details><summary>Show mistake</summary>
<p>

This is a subtle/debatable one. Whether or not this is ok hinges on how much we depend on this test to tell us if something changes about how the <code>Validator</code> object is defined and used in <code>main.py</code>. By making it a <code>MagicMock</code> instance, it will continue working even if the <code>Validator</code> method called within <code>is_cat_person</code> changes or stops existing. This is one drawback of the flexibility of <code>MagicMock</code>. The alternative is to import the Validator object and use the mock library's <code>create_autospec</code> function, as in: <code>@patch('main.Validator', create_autospec(Validator))</code>.
</p>
</details>

***

Those are all the big ones I've run up against so far. Happy mocking!

([Kitten image source](https://www.pexels.com/photo/animal-pet-cute-kitten-45201/), CC0 license)
