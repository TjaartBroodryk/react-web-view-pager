import * as React from 'react';
import Pager from './pager';
import './style.css';

interface Props {
  pages: React.ReactElement[];
  onPageChanged?: (index: number) => void;
  activePage: number;
}

const ViewPager = ({ pages, onPageChanged, activePage } : Props) => {
  const container = React.useRef<HTMLDivElement>(null);
  const pager = React.useRef<Pager>(null);
  const doneScrolling = React.useRef(true);

  React.useEffect(() => {
    const element = container.current;
    pager.current = new Pager(element!, {
      offset: '8rem'
    }, (currentItem) => {
      if(element) {
        onPageChanged && onPageChanged(currentItem)
        doneScrolling.current = true;
      }
    });

    return () => pager.current?.unbind();
  }, [container])

  React.useEffect(() => {
    if(doneScrolling.current) {
      pager.current?.snapTo(activePage);
      doneScrolling.current = false;
    }
  }, [activePage, pager])

  return <div className="pager" ref={container}>
    {pages.map((page, index) => <div className="pager-item" key={index}>
      {page}
    </div>)}
  </div>
}

export default ViewPager;