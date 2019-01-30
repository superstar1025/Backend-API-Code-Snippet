#!/bin/sh

while true
do

#move into your git repo where your jekyll site is
cd ~/a_folder_created_off_home/the_git_repo_folder_you_cloned_in;

git fetch;
LOCAL=$(git rev-parse HEAD);
REMOTE=$(git rev-parse @{u});

#if our local revision id doesn't match the remote, we will need to pull the changes
if [ $LOCAL != $REMOTE ]; then
    
    #pull and merge changes
    git pull origin master;


    npm install
    npm start
    
    jekyll build;

    #change back to home directory 
    cd
    
fi
sleep 5
done