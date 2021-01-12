
// cache some selectors we'll be using quite a bit
const $allStoriesList = $("#all-articles-list");
const $submitForm = $("#submit-form");
const $filteredArticles = $("#filtered-articles");
const $loginForm = $("#login-form");
const $createAccountForm = $("#create-account-form");
const $ownStories = $("#my-articles");

//nav links
const $navLogin = $("#nav-login");
const $navLogOut = $("#nav-logout");
const $navUserProfile = $("#nav-user-profile");
const $navMain = $('.main-nav-links');
const $submitLink = $("#nav-submit-story");
const $favoritesLink = $("#nav-favorites");
const $myarticlesLink = $("#nav-my-articles");

const $userProfile = $(".user-profile-box");
const $favArticles = $("#favorited-articles");
const $myArticles = $("#my-articles");



// global storyList variable
let storyList = null;

// global currentUser variable
let currentUser = null;
$(async function () {
  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);

    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  //submit event handler for  adding a new story
  $submitForm.on("submit", async function (evt) {
    evt.preventDefault();

    let author = $("#author").val();
    let title = $("#title").val();
    let url = $("#url").val();

    let newStory = {
      author: author,
      title: title,
      url: url
    }

    response = await StoryList.addStory(currentUser, newStory);

    currentUser.ownStories.push(response.story);
    generateStories();

  })
  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  //event handler for submit link
  $submitLink.on("click", function () {
    hideElements();
    $allStoriesList.toggle();
    $submitForm.slideToggle();
  });

  //handles Favorites tab
  $favoritesLink.on("click", function () {
    hideElements();
    $favArticles.html("");
    for (let story of currentUser.favorites) {
      const result = generateStoryHTML(story);
      $favArticles.append(result);
    }
    if (currentUser.favorites.length === 0) {
      $favArticles.append($("<h5>No Favorites yet!</h5>"))
    }
    $favArticles.toggle();
  });

  //click event for my articles tab
  $myarticlesLink.on("click", function () {
    showMyArticles();
  });
  //function to handle my articles tab
  function showMyArticles() {
    hideElements();
    $myArticles.html("");
    for (let story of currentUser.ownStories) {
      const result = generateStoryHTML(story);
      result.children("span").children().attr("class", "far fa-trash-alt");
      result.children("span").attr("class", "trash");
      $myArticles.append(result);
    }
    if (currentUser.ownStories.length === 0) {
      $favArticles.append($("<h5>No Stories yet!</h5>"))
    }
    $myArticles.toggle();
  }
  //click event to show userprofile link
  $navUserProfile.on("click", function () {
    hideElements();
    $userProfile.toggle();
  });
  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function () {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });


  //Event handler for Favoriting an Article
  $("body").on("click", ".star", async function () {

    //handles star color on dom
    let currClass = $(this).children().attr("class");
    currClass == "far fa-star" ? currClass = "fas fa-star" : currClass = "far fa-star";
    $(this).children().attr("class", currClass);

    const storyId = $(this).parent().attr("id");
    let favorited = false;

    for (favStory of currentUser.favorites) {
      if (favStory.storyId === storyId) {
        favorited = true;
      }
    }
    //logic to determine whether to favorite or unfavorite an article
    if (!favorited) {
      const user = await User.setFavoriteArticles(currentUser.loginToken, currentUser.username, storyId);
      currentUser = user;
    } else {
      const user = await User.removeFavoriteArticles(currentUser.loginToken, currentUser.username, storyId);
      currentUser = user;
    };
    localStorage.setItem("favorites", currentUser.favorites);
  })


  //delete a story
  $("body").on("click", ".trash", async function () {

    const storyId = $(this).parent().attr("id");

    await StoryList.deleteStory(currentUser.loginToken, storyId);
    for (let i = 0; i < currentUser.ownStories.length; i++) {
      if (currentUser.ownStories[i].storyId === storyId) {
        currentUser.ownStories.splice(i, 1);
      }
    }
    showMyArticles();
  })

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    let starClass = "far fa-star"
    if (currentUser) {
      for (favStory of currentUser.favorites)
        if (favStory.storyId === story.storyId) {
          starClass = "fas fa-star"
        }
    }

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
      <span class="star"> <i class="${starClass}"></i> </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $userProfile,
      $favArticles
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $navMain.show();
    $navUserProfile.show();
    updateUserProfile();
  }

  function updateUserProfile() {
    $navUserProfile.text(currentUser.username);
    $("#profile-name").text(`Name: ${currentUser.name}`);
    $("#profile-username").text(`Username: ${currentUser.username}`);
    $("#profile-account-date").text(`Account Created: ${currentUser.createdAt.slice(0, 10)}`);
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
