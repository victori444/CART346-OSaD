# CART346-OSaD

- [Keynotes—Record something you would normally ignore](./C01)
- [Signals—Record something you can't ignore](./C02)
- [10-second composition—One sourd, ten seconds](./C03)
- [Phase study—Something that repeats but never sounds the same](./C04)

## One-Sound-a Day 

For CART 346 Digital Sound I, you are expected to record, generate, or produce one sound or patch per day throughout the term. These media objects will respond to concepts, techniques, and aesthetic questions addressed in class. Depending on the point in the term, the sound or patches will focus on different aspects of digital sound techniques.

You will submit five sounds or patches per week, over ten weeks, for a total of 50 media objects.

Weekly submissions are due Mondays at 23:59, the day before class.

Fork this repository to your GitHub account (instead of download it) and clone it into your computer.



In the files submitted, always use the following file structure:

```
CXX-SYY-filename.fileextension
```

where XX is the week number, YY is the media object number, and the file extension the corresponding extension of the file.

The two files included in folder `C01` are examples of a first week’s submission.

```
C01-S01-wrapping-paper.wav
C01-S02-tapping-glass_FAV.wav
```

Indicate your favorite patch of the week by including `_FAV` in the filename. For example: `C01-S02-tapping-glass_FAV.wav`. Remember to never use spaces in filenames.

Enjoy!



### Resources and notes

New to Git? Follow [GitHub's Getting Started with Git guide](https://docs.github.com/en/get-started/learning-to-code/getting-started-with-git)

To serve your repository as a static page, go to your repository in your GitHub account, press “Settings” and then “Pages’. Then, in branch, choose “main” and then press “Save”. A blue banner saying “GitHub pages source saved” should appear. For detailed instructions [follow this documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)


If you get an error to "RPC failed; HTTP 400 curl 22 The requested URL returned error:400" or similar, you may want to increase the HTTP buffer. Run this in the VS Code terminal (or any terminal) inside the repo, then push again: 

```
git config http.postBuffer 524288000
git push
```