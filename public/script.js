const searchBar = document.getElementById("search_bar");
const groupsList = document.getElementById("groups_list");

let groups = [];

const request = new XMLHttpRequest();
request.addEventListener("load", () => {
  groups = JSON.parse(request.responseText);
  displayGroups(groups);
});
request.open("GET", "/groups");
request.send();

function displayGroups(groups) {
  groupsList.innerHTML = "";
  groups.forEach(group => {
    const link = document.createElement("a");
    link.href = group.link;
    link.target = '_blank';
    link.textContent = group.title;
    
    const listItem = document.createElement("li");
    listItem.appendChild(link);
    groupsList.appendChild(listItem);
  });
}

searchBar.addEventListener("keyup", () => {
  const searchTerm = searchBar.value.toLowerCase();
  const filteredGroups = groups.filter(group => group.title.toLowerCase().indexOf(searchTerm) >= 0);
  displayGroups(filteredGroups);
});
