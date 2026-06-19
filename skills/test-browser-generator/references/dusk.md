---
title: dusk
type: note
permalink: ram/04-ai-toolkit/skills/test/test-browser-generator/references/dusk
---

# Laravel Dusk Reference

Syntax, helpers, and patterns for `test-browser-generator` when generating Laravel Dusk tests.

---

## Setup

```bash
composer require --dev laravel/dusk
php artisan dusk:install
php artisan dusk:make LoginTest
php artisan dusk          # run all
php artisan dusk tests/Browser/LoginTest.php  # run one file
php artisan dusk --filter test_user_can_login  # run one method
```

---

## Base Structure

```php
<?php

namespace Tests\Browser;

use Laravel\Dusk\Browser;
use Tests\DuskTestCase;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use App\Models\User;

class YourFeatureTest extends DuskTestCase
{
    use DatabaseMigrations;

    /**
     * @throws \Throwable
     */
    public function test_user_can_do_something(): void
    {
        $user = User::factory()->create();

        $this->browse(function (Browser $browser) use ($user) {
            $browser->loginAs($user)
                    ->visit('/your-route')
                    ->assertSee('Expected text');
        });
    }
}
```

---

## Authentication

```php
// Login as user (most common)
$browser->loginAs($user)

// Login via form
$browser->visit('/login')
        ->type('email', 'user@example.com')
        ->type('password', 'secret')
        ->press('Login')
        ->assertPathIs('/dashboard');

// Guest state (no login needed — just visit)
$browser->visit('/public-page')
```

---

## Navigation

```php
$browser->visit('/path')
$browser->visitRoute('route.name')
$browser->back()
$browser->forward()
$browser->refresh()
$browser->assertPathIs('/expected/path')
$browser->assertPathBeginsWith('/prefix')
$browser->assertRouteIs('route.name')
```

---

## Interacting with Elements

```php
// Clicking
$browser->click('#selector')
$browser->click('@dusk-attribute')     // data-dusk="attribute"
$browser->clickLink('Link text')
$browser->press('Button text')         // submits forms too

// Typing
$browser->type('field-name', 'value')
$browser->type('@dusk-input', 'value')
$browser->clear('field-name')
$browser->append('field-name', ' more text')
$browser->typeSlowly('field-name', 'value')  // for JS-enhanced inputs

// Select / checkbox / radio
$browser->select('select-name', 'option-value')
$browser->check('checkbox-name')
$browser->uncheck('checkbox-name')
$browser->radio('radio-name', 'value')

// File upload
$browser->attach('file-input', __DIR__.'/fixtures/test.pdf')
```

---

## Dusk Selectors (data-dusk attribute)

Dusk's preferred selector mechanism — add `data-dusk` to HTML elements:

```html
<button data-dusk="submit-button">Submit</button>
<input data-dusk="email-input" type="email">
<div data-dusk="success-message">Success!</div>
```

```php
// Reference with @ prefix
$browser->click('@submit-button')
$browser->type('@email-input', 'user@example.com')
$browser->assertVisible('@success-message')
```

---

## Waiting

```php
// Wait for element to appear (max 5 seconds by default)
$browser->waitFor('#element')
$browser->waitFor('@dusk-selector')
$browser->waitForText('Expected text')
$browser->waitForLink('Click here')
$browser->waitUntilMissing('#loading-spinner')
$browser->waitUntilEnabled('@submit-button')

// Wait for Vue/React to finish rendering
$browser->waitForReload(function (Browser $browser) {
    $browser->press('@submit-button');
})

// Wait with custom timeout
$browser->waitFor('@element', 10)  // 10 seconds

// Pause (avoid — use waitFor instead)
$browser->pause(1000)  // only as last resort
```

---

## Assertions

```php
// Text and content
$browser->assertSee('Expected text')
$browser->assertDontSee('Hidden text')
$browser->assertSeeIn('@container', 'text inside element')
$browser->assertTitle('Page Title')

// Element state
$browser->assertVisible('@element')
$browser->assertMissing('@element')
$browser->assertEnabled('@button')
$browser->assertDisabled('@button')
$browser->assertChecked('@checkbox')
$browser->assertNotChecked('@checkbox')

// Input values
$browser->assertInputValue('@input', 'expected value')
$browser->assertSelected('@select', 'option-value')

// URL and routing
$browser->assertPathIs('/expected/path')
$browser->assertQueryStringHas('key', 'value')
$browser->assertFragmentIs('section')

// Authentication
$browser->assertAuthenticated()
$browser->assertGuest()
$browser->assertAuthenticatedAs($user)
```

---

## Modals and Dialogs

```php
// JS alert/confirm/prompt
$browser->waitForDialog()
        ->assertDialogOpened('Alert message')
        ->acceptDialog();

$browser->waitForDialog()
        ->dismissDialog();

// Custom modal (not native JS dialog)
$browser->click('@open-modal-button')
        ->waitFor('@modal')
        ->assertVisible('@modal')
        ->assertSeeIn('@modal', 'Modal content')
        ->click('@modal-close')
        ->waitUntilMissing('@modal')
```

---

## Multiple Browsers (for real-time features)

```php
$this->browse(function (Browser $first, Browser $second) use ($user1, $user2) {
    $first->loginAs($user1)->visit('/chat');
    $second->loginAs($user2)->visit('/chat');

    $first->type('@message-input', 'Hello!')
          ->press('@send-button');

    $second->waitForText('Hello!')
           ->assertSee('Hello!');
});
```

---

## Screenshots (for debugging)

```php
$browser->screenshot('my-screenshot-name')
// Saved to: tests/Browser/screenshots/my-screenshot-name.png
```

---

## Full Example Template

```php
<?php

namespace Tests\Browser;

use Laravel\Dusk\Browser;
use Tests\DuskTestCase;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use App\Models\User;

class PressReleaseTest extends DuskTestCase
{
    use DatabaseMigrations;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_authenticated_user_can_create_press_release(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->loginAs($this->user)
                    ->visit('/press-releases/create')
                    ->assertPathIs('/press-releases/create')
                    ->type('@title-input', 'My Press Release')
                    ->type('@body-textarea', 'Press release content here.')
                    ->select('@status-select', 'draft')
                    ->press('@submit-button')
                    ->waitForText('Press release created')
                    ->assertSee('Press release created')
                    ->assertPathIs('/press-releases');
        });
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('/press-releases/create')
                    ->assertPathIs('/login');
        });
    }

    public function test_form_shows_validation_errors_on_empty_submit(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->loginAs($this->user)
                    ->visit('/press-releases/create')
                    ->press('@submit-button')
                    ->waitFor('@title-error')
                    ->assertVisible('@title-error')
                    ->assertSeeIn('@title-error', 'required');
        });
    }
}
```

---

## Common data-dusk Attributes to Request from Frontend

When generating Dusk tests, list these attributes that need to be added to the HTML:

```
data-dusk="submit-button"
data-dusk="cancel-button"
data-dusk="{field-name}-input"
data-dusk="{field-name}-error"
data-dusk="success-message"
data-dusk="loading-spinner"
data-dusk="modal"
data-dusk="modal-close"
data-dusk="{item-id}-row"          (for table rows, use dynamic ID)
data-dusk="{item-id}-delete-btn"
```