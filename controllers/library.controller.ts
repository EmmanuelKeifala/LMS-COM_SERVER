import {NextFunction, Request, Response} from 'express';
import {CatchAsyncErrors} from '../middleware/catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import * as libgen from 'libgen-ts';
import axios from 'axios';
import cheerio from 'cheerio';
import {JSDOM} from 'jsdom';

// Function to convert file size
function convertFileSize(sizeInBytes: any) {
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;

  if (sizeInBytes < KB) {
    return sizeInBytes + ' bytes';
  } else if (sizeInBytes < MB) {
    return (sizeInBytes / KB).toFixed(2) + ' KB';
  } else if (sizeInBytes < GB) {
    return (sizeInBytes / MB).toFixed(2) + ' MB';
  } else {
    return (sizeInBytes / GB).toFixed(2) + ' GB';
  }
}

// Function to scrape website for download URL

export const getBooks = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query: any = req.body;

      const urlString = await libgen.mirror();
      const options = {
        mirror: urlString,
        query: query.query,
        count: 10,
        sort_by: 'year',
        reverse: true,
      };

      // Search for books
      let books = await libgen.search(options);

      // Format the books data
      const formattedBooks = await Promise.all(
        books.map(async (book: any) => {
          const downloadUrl = `https://library.lol/main/${book.md5}`;
          return {
            id: book.id,
            title: book.title,
            author: book.author,
            year: book.year,
            language: book.language,
            filesize: convertFileSize(book.filesize),
            pagesinfile: book.pagesinfile,
            coverurl: `https://library.lol/covers/${book.coverurl}`,
            downloadUrl: downloadUrl,
          };
        }),
      );

      // Return the formatted data
      res.status(200).json(formattedBooks);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  },
);
